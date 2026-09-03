'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { deriveYouTubeThumbnail, deriveCloudflareThumbnail } from '@/lib/thumbnails';

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

  const record = {
    title,
    slug: (formData.get('slug') as string) || slugify(title),
    church_id: (formData.get('church_id') as string) || null,
    event_id: (formData.get('event_id') as string) || null,
    speaker: (formData.get('speaker') as string) || null,
    series: (formData.get('series') as string) || null,
    provider,
    provider_video_id: providerVideoId,
    thumbnail,
    language: (formData.get('language') as string) || null,
    description: (formData.get('description') as string) || null,
    recorded_date: (formData.get('recorded_date') as string) || null,
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
  revalidatePath('/videos');
  revalidatePath('/');
  redirect('/admin/videos');
}

export async function deleteVideo(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();
  // video_categories has `on delete cascade` on video_id, so no manual cleanup needed there.
  await supabase.from('videos').delete().eq('id', id);
  revalidatePath('/admin/videos');
  revalidatePath('/videos');
  revalidatePath('/');
}
