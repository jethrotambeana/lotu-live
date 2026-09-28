import type { SupabaseClient } from '@supabase/supabase-js';

// Only YouTube and Cloudflare Stream reliably support starting playback
// at a specific timestamp in this app's embed setup — confirmed directly
// against their own documented parameters (YouTube's ?start=, Cloudflare
// Stream's ?startTime=) rather than assumed. Cloudinary videos are
// excluded from the channel (both the playlist and "play now") for now,
// even if they have a duration set — joining mid-video wouldn't work
// correctly for that provider without further work this feature doesn't
// need yet.
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
      // True when this is the admin's "Play now" pick rather than the
      // regular playlist rotation — ChannelClient shows a distinct badge
      // for this instead of the normal "Now playing" line.
      forced?: boolean;
    }
  | { mode: 'empty' };

interface PlaylistVideo {
  id: string;
  slug: string;
  title: string;
  provider: 'youtube' | 'cloudflare';
  provider_video_id: string;
  duration_seconds: number;
}

// Deterministic, server-state-free scheduling for the admin-ordered
// playlist: every viewer's independent poll computes the exact same
// "where are we in the loop right now" answer just from the current time
// and the playlist itself, the same trick the old date-seeded shuffle
// used — except now the order comes from the admin's own arrangement
// (channel_playlist.position) instead of being reshuffled daily, since
// the admin is explicitly curating it.
function computePlaylistSegment(
  playlist: PlaylistVideo[],
  now: Date = new Date()
): { video: PlaylistVideo; offsetSeconds: number; segmentEndsAt: Date } | null {
  const totalSeconds = playlist.reduce((sum, v) => sum + v.duration_seconds, 0);
  if (totalSeconds <= 0) return null;

  const nowSeconds = Math.floor(now.getTime() / 1000);
  const elapsed = nowSeconds % totalSeconds;

  let cursor = 0;
  for (const video of playlist) {
    const dur = video.duration_seconds;
    if (elapsed < cursor + dur) {
      const offsetSeconds = elapsed - cursor;
      const segmentEndsAt = new Date((nowSeconds - offsetSeconds + dur) * 1000);
      return { video, offsetSeconds, segmentEndsAt };
    }
    cursor += dur;
  }
  // Unreachable in practice (elapsed is always < totalSeconds by
  // construction) — only possible via a floating-point/rounding edge
  // case, so fall back to the first video rather than showing nothing.
  const first = playlist[0];
  return { video: first, offsetSeconds: 0, segmentEndsAt: new Date((nowSeconds + first.duration_seconds) * 1000) };
}

// Single source of truth for "what should the channel be showing right
// now" — used by both app/channel/page.tsx (the initial server-rendered
// paint) and app/api/channel-status/route.ts (the client's periodic
// polling), so the two can never fall out of sync with each other.
//
// Priority order: 1) an active admin "Play now" override, 2) any live
// broadcast, 3) the admin-curated playlist, 4) empty. The override sits
// above live on purpose — it's a deliberate, explicit admin action, so it
// should win even over an in-progress livestream until it naturally
// finishes (or the admin clears it early from Admin → Channel).
export async function getChannelState(supabase: SupabaseClient<any>): Promise<ChannelState> {
  // 1. Admin override ("Play now"), if still within its one play-through.
  const { data: overrideRow } = await supabase
    .from('channel_override')
    .select('video_id, started_at, videos(id, slug, title, provider, provider_video_id, duration_seconds)')
    .eq('id', 1)
    .maybeSingle();

  const overrideVideo = overrideRow?.video_id ? (overrideRow as any).videos : null;

  if (overrideVideo && SEEKABLE_PROVIDERS.includes(overrideVideo.provider) && overrideVideo.duration_seconds) {
    const startedAt = new Date(overrideRow!.started_at as string);
    const offsetSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);

    if (offsetSeconds < overrideVideo.duration_seconds) {
      const embedUrl = buildEmbedUrl(overrideVideo.provider, overrideVideo.provider_video_id, offsetSeconds, false);
      return {
        mode: 'vod',
        title: overrideVideo.title,
        videoSlug: overrideVideo.slug,
        // Stable for the whole one-shot play-through (started_at doesn't
        // change), so this never remounts the player mid-playback — only
        // the natural expiry below (which falls through to a DIFFERENT
        // embedKey from live/playlist) causes a fresh load.
        embedKey: `override-${overrideRow!.started_at}`,
        embedUrl,
        provider: overrideVideo.provider,
        forced: true,
      };
    }

    // Expired — clear it lazily so the admin UI stops showing it as
    // active and the next call here doesn't need to repeat this check.
    // Best-effort: if this fails, the offsetSeconds check above will just
    // keep skipping the override on every future call anyway.
    await supabase.from('channel_override').update({ video_id: null }).eq('id', 1);
  }

  // 2. Live cutover: any visible, currently-live stream takes over
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

  // 3. No one's live and nothing's forced — play the admin-curated
  // playlist (Admin → Channel), in the order the admin set.
  const { data: playlistRows } = await supabase
    .from('channel_playlist')
    .select('position, videos(id, slug, title, provider, provider_video_id, duration_seconds)')
    .order('position', { ascending: true });

  const playlist: PlaylistVideo[] = (playlistRows ?? [])
    .map((row: any) => row.videos)
    .filter((v: any) => v && SEEKABLE_PROVIDERS.includes(v.provider) && v.duration_seconds);

  const segment = computePlaylistSegment(playlist);

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
    // same video appears more than once in the playlist (or the playlist
    // loops back to its start), each occurrence still gets its own end
    // timestamp, so the player correctly treats them as distinct segments
    // rather than getting stuck on the first one's offset.
    embedKey: `vod-${segment.segmentEndsAt.toISOString()}`,
    embedUrl,
    provider: segment.video.provider,
  };
}
