import type { SupabaseClient } from '@supabase/supabase-js';
import { computeCurrentSegment, ChannelVideo } from '@/lib/channelSchedule';

// Only YouTube and Cloudflare Stream reliably support starting playback
// at a specific timestamp in this app's embed setup — confirmed directly
// against their own documented parameters (YouTube's ?start=, Cloudflare
// Stream's ?startTime=) rather than assumed. Cloudinary videos are
// excluded from the channel rotation for now, even if they have a
// duration set — joining mid-video wouldn't work correctly for that
// provider without further work this feature doesn't need yet.
export const SEEKABLE_PROVIDERS = ['youtube', 'cloudflare'];

function extractYouTubeId(input: string): string {
  const match = input.match(/(?:v=|youtu\.be\/|live\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : input;
}

function extractCloudflareId(input: string): string {
  const match = input.match(/cloudflarestream\.com\/([a-zA-Z0-9]+)/);
  return match ? match[1] : input;
}

// controls=0/false, modestbranding, and rel=0 all serve the same goal:
// this should feel like tuning into a channel, not watching an embedded
// YouTube/Cloudflare video with a visible player chrome and related-video
// links out of the site.
//
// enablejsapi=1 (YouTube) is required for ChannelPlayer's mute/unmute,
// volume controls, and startup-cover state tracking to work at all.
export function buildEmbedUrl(
  provider: string,
  providerVideoId: string,
  startSeconds: number,
  isLive: boolean
): string {
  if (provider === 'youtube') {
    const id = extractYouTubeId(providerVideoId);
    const params = new URLSearchParams({
      autoplay: '1',
      mute: '1',
      controls: '0',
      modestbranding: '1',
      rel: '0',
      enablejsapi: '1',
    });
    if (!isLive) params.set('start', String(startSeconds));
    return `https://www.youtube.com/embed/${id}?${params.toString()}`;
  }
  if (provider === 'cloudflare') {
    const id = extractCloudflareId(providerVideoId);
    const customerCode = process.env.NEXT_PUBLIC_CLOUDFLARE_CUSTOMER_CODE;
    const params = new URLSearchParams({ autoplay: 'true', muted: 'true', controls: 'false' });
    if (!isLive) params.set('startTime', String(startSeconds));
    return `https://customer-${customerCode}.cloudflarestream.com/${id}/iframe?${params.toString()}`;
  }
  return '';
}

export type ChannelState =
  | { mode: 'live'; title: string; embedKey: string; embedUrl: string; provider: 'youtube' | 'cloudflare' }
  | {
      mode: 'vod';
      title: string;
      videoSlug: string;
      embedKey: string;
      embedUrl: string;
      provider: 'youtube' | 'cloudflare';
    }
  | { mode: 'empty' };

// Single source of truth for "what should the channel be showing right
// now" — used by both app/channel/page.tsx (the initial server-rendered
// paint) and app/api/channel-status/route.ts (the client's periodic
// polling), so the two can never fall out of sync with each other.
export async function getChannelState(supabase: SupabaseClient<any>): Promise<ChannelState> {
  // Live cutover: any visible, currently-live stream takes over
  // immediately. If more than one happens to be live at once, an admin's
  // existing Featured flag picks the winner — falling back to whichever
  // went live most recently if nothing is marked Featured, rather than
  // an arbitrary/undefined order.
  const { data: liveStreams } = await supabase
    .from('livestreams')
    .select('id, slug, name, provider, provider_stream_id, featured, last_live_at')
    .eq('status', 'live')
    .eq('visible', true)
    .in('provider', SEEKABLE_PROVIDERS)
    .order('featured', { ascending: false })
    .order('last_live_at', { ascending: false })
    .limit(1);

  const liveStream = liveStreams?.[0];

  if (liveStream) {
    const embedUrl = buildEmbedUrl(liveStream.provider, liveStream.provider_stream_id, 0, true);
    return {
      mode: 'live',
      title: liveStream.name,
      embedKey: `live-${liveStream.id}`,
      embedUrl,
      provider: liveStream.provider as 'youtube' | 'cloudflare',
    };
  }

  // No one's live — play the scheduled video rotation instead.
  const { data: videos } = await supabase
    .from('videos')
    .select('id, slug, title, provider, provider_video_id, duration_seconds')
    .eq('approved', true)
    .not('duration_seconds', 'is', null)
    .in('provider', SEEKABLE_PROVIDERS);

  const segment = computeCurrentSegment((videos ?? []) as ChannelVideo[]);

  if (!segment) {
    return { mode: 'empty' };
  }

  const embedUrl = buildEmbedUrl(
    segment.video.provider,
    segment.video.provider_video_id,
    segment.offsetSeconds,
    false
  );

  return {
    mode: 'vod',
    title: segment.video.title,
    videoSlug: segment.video.slug,
    // Unique per actual scheduled occurrence (not just per video) — if the
    // same video ever appears more than once in a day's rotation (a small
    // library looping), each occurrence still gets its own end timestamp,
    // so the player correctly treats them as distinct segments rather than
    // getting stuck on the first one's offset.
    embedKey: `vod-${segment.segmentEndsAt.toISOString()}`,
    embedUrl,
    provider: segment.video.provider as 'youtube' | 'cloudflare',
  };
}
