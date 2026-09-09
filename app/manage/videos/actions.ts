'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { deriveYouTubeThumbnail, deriveCloudflareThumbnail } from '@/lib/thumbnails';
import { deleteCloudflareRecording } from '@/lib/cloudflareStream';
import { requireEditor } from '@/lib/requireEditor';

type VideoProvider = 'cloudflare' | 'youtube' | 'cloudinary';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function saveMyVideo(formData: FormData) {
  const { supabase, scope } = await requireEditor();
  const videoScopeColumn = scope.type === 'church' ? 'church_id' : 'ministry_id';
  const eventScopeColumn = scope.type === 'church' ? 'host_church_id' : 'host_ministry_id';

  const id = (formData.get('id') as string) || null;
  const title = formData.get('title') as string;
  const provider = formData.get('provider') as VideoProvider;
  const providerVideoId = formData.get('provider_video_id') as string;

  const manualThumbnail = (formData.get('thumbnail') as string) || null;
  let thumbnail = manualThumbnail;
  if (!thumbnail) {
    if (provider === 'youtube') thumbnail = deriveYouTubeThumbnail(providerVideoId);
    else if (provider === 'cloudflare') thumbnail = deriveCloudflareThumbnail(providerVideoId);
  }

  // event_id must belong to this editor's own church/ministry.
  const requestedEventId = (formData.get('event_id') as string) || null;
  let eventId: string | null = null;
  if (requestedEventId) {
    const { data: ownEvent } = await supabase
      .from('events')
      .select('id')
      .eq('id', requestedEventId)
      .eq(eventScopeColumn, scope.id)
      .single();
    eventId = ownEvent?.id ?? null;
  }

  const record: Record<string, unknown> = {
    title,
    slug: (formData.get('slug') as string) || slugify(title),
    church_id: scope.type === 'church' ? scope.id : null,
    ministry_id: scope.type === 'ministry' ? scope.id : null,
    event_id: eventId,
    speaker: (formData.get('speaker') as string) || null,
    series: (formData.get('series') as string) || null,
    provider,
    provider_video_id: providerVideoId,
    thumbnail,
    language: (formData.get('language') as string) || null,
    description: (formData.get('description') as string) || null,
    recorded_date: (formData.get('recorded_date') as string) || null,
    // Every editor save — new or edited — requires admin re-approval before
    // it's visible on the public site, even if this video was previously
    // approved. Only /admin can flip this back to true.
    approved: false,
  };

  let videoId = id;

  if (id) {
    const { error } = await supabase.from('videos').update(record).eq('id', id).eq(videoScopeColumn, scope.id);
    if (error) {
      console.error('Failed to update video (editor):', error);
      throw new Error(`Failed to save: ${error.message}`);
    }
  } else {
    const { data, error } = await supabase.from('videos').insert(record).select('id').single();
    if (error || !data) {
      console.error('Failed to create video (editor):', error);
      throw new Error('Failed to create video record.');
    }
    videoId = data.id;
  }

  const categoryIds = formData.getAll('category_ids') as string[];
  if (videoId) {
    await supabase.from('video_categories').delete().eq('video_id', videoId);
    if (categoryIds.length > 0) {
      await supabase
        .from('video_categories')
        .insert(categoryIds.map((category_id) => ({ video_id: videoId, category_id })));
    }
  }

  revalidatePath('/manage/videos');
  revalidatePath('/videos');
  revalidatePath('/');
  redirect('/manage/videos');
}

export async function deleteMyVideo(formData: FormData) {
  const { supabase, scope } = await requireEditor();
  const videoScopeColumn = scope.type === 'church' ? 'church_id' : 'ministry_id';
  const id = formData.get('id') as string;

  // Fetch provider/provider_video_id first — scoped the same way the
  // delete itself is, so an editor can only ever trigger a Cloudflare
  // delete for a video that's genuinely their own, never an arbitrary id.
  const { data: video } = await supabase
    .from('videos')
    .select('provider, provider_video_id')
    .eq('id', id)
    .eq(videoScopeColumn, scope.id)
    .maybeSingle();

  await supabase.from('videos').delete().eq('id', id).eq(videoScopeColumn, scope.id);

  // Best-effort, non-blocking — see lib/cloudflareStream.ts. The row above
  // is already deleted regardless of whether this succeeds. `video` is
  // null here if the id didn't belong to this editor in the first place,
  // in which case there's nothing to delete on Cloudflare's side either.
  if (video?.provider === 'cloudflare' && video.provider_video_id) {
    await deleteCloudflareRecording(video.provider_video_id);
  }

  revalidatePath('/manage/videos');
  revalidatePath('/videos');
  revalidatePath('/');
}
