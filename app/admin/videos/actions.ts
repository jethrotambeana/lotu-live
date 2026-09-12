'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { deriveYouTubeThumbnail, deriveCloudflareThumbnail } from '@/lib/thumbnails';
import { deleteCloudflareRecording } from '@/lib/cloudflareStream';
import { lookupVideoDuration } from '@/lib/videoDuration';

// videos.provider check constraint only allows these three (see sql/schema.sql) —
// note this is a different set than livestreams' Provider type in lib/embed.ts
// (which has facebook/hls instead of cloudinary).
export type VideoProvider = 'cloudflare' | 'youtube' | 'cloudinary';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Same soft-check pattern as lib/embed.ts's isPlausibleProviderId, extended to
// cover 'cloudinary' which that helper doesn't know about. This never blocks
// saving — see the note in lib/embed.ts about why the real protection is
// URL-encoding at render time, not this check.
function isPlausibleVideoProviderId(provider: VideoProvider, value: string): boolean {
  if (!value || value.length > 500) return false;
  switch (provider) {
    case 'cloudflare':
      return /^[a-zA-Z0-9_-]+$/.test(value);
    case 'youtube':
      return /^[a-zA-Z0-9_-]{6,20}$/.test(value);
    case 'cloudinary':
      // No established ID/URL convention yet — accept anything non-empty.
      return true;
    default:
      return false;
  }
}

export async function saveVideo(formData: FormData) {
  const id = (formData.get('id') as string) || null;
  const title = formData.get('title') as string;
  const provider = formData.get('provider') as VideoProvider;
  const providerVideoId = formData.get('provider_video_id') as string;

  if (!isPlausibleVideoProviderId(provider, providerVideoId)) {
    console.warn(`Unusual video provider ID format for provider "${provider}": ${providerVideoId}`);
  }

  const supabase = createClient();

  const manualThumbnail = (formData.get('thumbnail') as string) || null;
  let thumbnail = manualThumbnail;
  if (!thumbnail) {
    if (provider === 'youtube') {
      thumbnail = deriveYouTubeThumbnail(providerVideoId);
    } else if (provider === 'cloudflare') {
      thumbnail = deriveCloudflareThumbnail(providerVideoId);
    }
    // cloudinary: no auto-derivation yet — leave null, admin pastes manually.
  }

  // Powers the LOTU.Live Channel's scheduling math — needs to know
  // exactly how long each video is. Auto-looked-up for YouTube/Cloudflare
  // (same APIs already used elsewhere); a manual "Duration (seconds)"
  // field on the form is the fallback for Cloudinary (no API integration
  // exists for it) or if auto-lookup fails for any reason (e.g. a
  // YouTube video still processing). Manual entry always wins if
  // provided, same priority pattern as the thumbnail field above.
  const manualDuration = formData.get('duration_seconds') as string;
  let durationSeconds: number | null = manualDuration ? parseInt(manualDuration, 10) : null;
  if (durationSeconds === null || Number.isNaN(durationSeconds)) {
    durationSeconds = await lookupVideoDuration(provider, providerVideoId);
  }

  const record = {
    title,
    slug: (formData.get('slug') as string) || slugify(title),
    church_id: (formData.get('church_id') as string) || null,
    ministry_id: (formData.get('ministry_id') as string) || null,
    event_id: (formData.get('event_id') as string) || null,
    speaker: (formData.get('speaker') as string) || null,
    series_id: (formData.get('series_id') as string) || null,
    episode_number: formData.get('episode_number')
      ? parseInt(formData.get('episode_number') as string, 10)
      : null,
    provider,
    provider_video_id: providerVideoId,
    thumbnail,
    duration_seconds: durationSeconds,
    language: (formData.get('language') as string) || null,
    description: (formData.get('description') as string) || null,
    recorded_date: (formData.get('recorded_date') as string) || null,
    approved: formData.get('approved') === 'on',
  };

  let videoId = id;

  if (id) {
    await supabase.from('videos').update(record).eq('id', id);
  } else {
    const { data, error } = await supabase.from('videos').insert(record).select('id').single();
    if (error || !data) {
      throw new Error('Failed to create video record.');
    }
    videoId = data.id;
  }

  // Categories: replace the full set on every save. Simplest correct approach
  // for a plain join table with no columns of its own beyond the two keys.
  const categoryIds = formData.getAll('category_ids') as string[];
  if (videoId) {
    await supabase.from('video_categories').delete().eq('video_id', videoId);
    if (categoryIds.length > 0) {
      await supabase
        .from('video_categories')
        .insert(categoryIds.map((category_id) => ({ video_id: videoId, category_id })));
    }
  }

  revalidatePath('/admin/videos');
  revalidatePath('/admin/series');
  revalidatePath('/videos');
  revalidatePath('/');
  redirect('/admin/videos');
}

export async function deleteVideo(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();

  // Fetch provider/provider_video_id first — needed to also remove the
  // underlying Cloudflare recording, not just this app's own row.
  const { data: video } = await supabase.from('videos').select('provider, provider_video_id').eq('id', id).single();

  // video_categories has `on delete cascade` on video_id, so no manual cleanup needed there.
  await supabase.from('videos').delete().eq('id', id);

  // Best-effort, non-blocking — see lib/cloudflareStream.ts. The row above
  // is already deleted regardless of whether this succeeds.
  if (video?.provider === 'cloudflare' && video.provider_video_id) {
    await deleteCloudflareRecording(video.provider_video_id);
  }

  revalidatePath('/admin/videos');
  revalidatePath('/videos');
  revalidatePath('/');
}

export async function toggleVideoApproved(formData: FormData) {
  const id = formData.get('id') as string;
  const approved = formData.get('approved') === 'true';
  const supabase = createClient();
  await supabase.from('videos').update({ approved: !approved }).eq('id', id);
  revalidatePath('/admin/videos');
  revalidatePath('/videos');
  revalidatePath('/');
}

// One-time catch-up for videos saved before duration tracking existed.
// Capped at 20 per click — a serverless function has an execution time
// limit, and looking up dozens of videos sequentially in one request
// risks timing out partway through. Click again to process the next
// batch; already-populated videos are never re-processed, so repeated
// clicks are always safe and make steady progress rather than redoing
// work.
const BACKFILL_BATCH_SIZE = 20;

export async function backfillVideoDurations(): Promise<{ processed: number; updated: number; remaining: number }> {
  const supabase = createClient();

  const { data: videos } = await supabase
    .from('videos')
    .select('id, provider, provider_video_id')
    .is('duration_seconds', null)
    .in('provider', ['youtube', 'cloudflare']) // cloudinary has no lookup — see lib/videoDuration.ts
    .limit(BACKFILL_BATCH_SIZE);

  let updated = 0;
  for (const video of videos ?? []) {
    const duration = await lookupVideoDuration(video.provider, video.provider_video_id);
    if (duration !== null) {
      await supabase.from('videos').update({ duration_seconds: duration }).eq('id', video.id);
      updated++;
    }
  }

  const { count: remaining } = await supabase
    .from('videos')
    .select('id', { count: 'exact', head: true })
    .is('duration_seconds', null)
    .in('provider', ['youtube', 'cloudflare']);

  revalidatePath('/admin/videos');
  return { processed: videos?.length ?? 0, updated, remaining: remaining ?? 0 };
}
