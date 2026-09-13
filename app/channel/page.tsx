import { createClient } from '@/lib/supabaseServer';
import { computeCurrentSegment, ChannelVideo } from '@/lib/channelSchedule';
import ChannelPlayer from '@/components/ChannelPlayer';

export const metadata = {
  title: 'LOTU.Live Channel — Watch Now',
  description:
    'Pacific Gospel media, playing continuously — livestreams take over automatically the moment one begins.',
};

// Only YouTube and Cloudflare Stream reliably support starting playback
// at a specific timestamp in this app's embed setup — confirmed directly
// against their own documented parameters (YouTube's ?start=, Cloudflare
// Stream's ?startTime=) rather than assumed. Cloudinary videos are
// excluded from the channel rotation for now, even if they have a
// duration set — joining mid-video wouldn't work correctly for that
// provider without further work this feature doesn't need yet.
const SEEKABLE_PROVIDERS = ['youtube', 'cloudflare'];

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
function buildEmbedUrl(provider: string, providerVideoId: string, startSeconds: number, isLive: boolean): string {
  if (provider === 'youtube') {
    const id = extractYouTubeId(providerVideoId);
    const params = new URLSearchParams({
      autoplay: '1',
      mute: '1',
      controls: '0',
      modestbranding: '1',
      rel: '0',
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

export default async function ChannelPage() {
  const supabase = createClient();

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
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            LIVE NOW
          </span>
          <h1 className="text-xl font-bold">{liveStream.name}</h1>
        </div>
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          {embedUrl && <ChannelPlayer embedKey={`live-${liveStream.id}`} embedUrl={embedUrl} />}
        </div>
        <p className="mt-3 text-sm text-slate-500">
          The LOTU.Live Channel cuts to any live broadcast automatically — when this one ends,
          it'll return to the regular video rotation.
        </p>
      </div>
    );
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
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">LOTU.Live Channel</h1>
        <p className="text-slate-500">
          Nothing's ready to play yet — videos need a duration set before they can join the
          rotation. Admin → Videos → "Backfill Missing Durations" catches up existing ones.
        </p>
      </div>
    );
  }

  const embedUrl = buildEmbedUrl(
    segment.video.provider,
    segment.video.provider_video_id,
    segment.offsetSeconds,
    false
  );

  // Unique per actual scheduled occurrence (not just per video) — if the
  // same video ever appears more than once in a day's rotation (a small
  // library looping), each occurrence still gets its own end timestamp,
  // so the player correctly treats them as distinct segments rather than
  // getting stuck on the first one's offset.
  const embedKey = `vod-${segment.segmentEndsAt.toISOString()}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">LOTU.Live Channel</h1>
      <p className="mb-4 text-slate-500">Now playing: {segment.video.title}</p>
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        {embedUrl && <ChannelPlayer embedKey={embedKey} embedUrl={embedUrl} />}
      </div>
      <p className="mt-3 text-sm text-slate-500">
        Playing continuously from the video library — the channel automatically switches to any
        church's livestream the moment one begins.
      </p>
      <a href={`/video/${segment.video.slug}`} className="mt-2 inline-block text-sm text-sky-600 underline">
        View this video's own page →
      </a>
    </div>
  );
}
