'use client';

import { useEffect, useState } from 'react';
import ChannelPlayer from '@/components/ChannelPlayer';
import ShareButton from '@/components/ShareButton';
import type { ChannelState } from '@/lib/channelEmbed';

const POLL_INTERVAL_MS = 20000;

// Hardcoded rather than derived from window.location: this component
// renders on the server first (part of the initial page render, before
// hydration), where window doesn't exist, so reading window.location here
// would either crash or mismatch between server and client output. The
// production domain is fixed, so a constant is simpler and also
// guarantees the shared link is always the real lotu.live URL rather than
// a preview/staging domain the page happened to be loaded from.
const CHANNEL_URL = 'https://lotu.live/channel';

export default function ChannelClient({ initial }: { initial: ChannelState }) {
  const [state, setState] = useState<ChannelState>(initial);

  // Owned here, not inside ChannelPlayer, specifically so it survives a
  // segment/live cutover. ChannelPlayer remounts fresh (key={state.embedKey})
  // whenever the video actually changes — needed so the new video's iframe
  // loads — but that means state kept only inside ChannelPlayer would reset
  // to muted/default-volume on every cutover. Keeping it up here and handing
  // it down as the new instance's starting point lets a viewer who unmuted
  // stay unmuted across the whole channel, not just for one video.
  const [audioPrefs, setAudioPrefs] = useState({ muted: true, volume: 70 });

  // Polls a small JSON endpoint instead of calling router.refresh().
  // router.refresh() re-runs the whole Server Component tree for this
  // route, and was found to occasionally cause the embedded video iframe
  // to reload (a black flash, and the mute/volume the viewer had set
  // getting reset) even though ChannelPlayer's own props hadn't
  // meaningfully changed. Polling JSON here keeps the reload decision
  // entirely in our own hands — only ChannelPlayer's `embedKey` prop
  // actually changing swaps the iframe; everything else here just updates
  // the surrounding text.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/channel-status', { cache: 'no-store' });
        if (!res.ok) return;
        const next = (await res.json()) as ChannelState;
        setState(next);
      } catch (err) {
        console.error('ChannelClient: poll failed:', err);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (state.mode === 'empty') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">LOTU.Live Channel</h1>
        <p className="text-slate-500">
          Nothing's ready to play yet — the channel playlist is empty. Admin → Channel to add
          videos to it.
        </p>
      </div>
    );
  }

  if (state.mode === 'live') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              LIVE NOW
            </span>
            <h1 className="text-xl font-bold">{state.title}</h1>
          </div>
          <ShareButton url={CHANNEL_URL} title="LOTU.Live Channel" />
        </div>
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          {/* key={state.embedKey} guarantees React treats a genuinely new
              livestream as a fresh mount, while an unchanged embedKey
              across polls is guaranteed never to remount the iframe. */}
          <ChannelPlayer
            key={state.embedKey}
            embedKey={state.embedKey}
            embedUrl={state.embedUrl}
            provider={state.provider}
            initialMuted={audioPrefs.muted}
            initialVolume={audioPrefs.volume}
            onAudioChange={(muted, volume) => setAudioPrefs({ muted, volume })}
          />
        </div>
        <p className="mt-3 text-sm text-slate-500">
          The LOTU.Live Channel cuts to any live broadcast automatically — when this one ends,
          it'll return to the regular video rotation.
        </p>
      </div>
    );
  }

  // state.mode === 'vod'
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {state.forced && (
            <span className="rounded bg-amber-500 px-2 py-0.5 text-xs font-semibold uppercase text-white">
              Playing now
            </span>
          )}
          <h1 className="text-2xl font-bold">LOTU.Live Channel</h1>
        </div>
        <ShareButton url={CHANNEL_URL} title="LOTU.Live Channel" />
      </div>
      <p className="mb-4 text-slate-500">Now playing: {state.title}</p>
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <ChannelPlayer
          key={state.embedKey}
          embedKey={state.embedKey}
          embedUrl={state.embedUrl}
          provider={state.provider}
          initialMuted={audioPrefs.muted}
          initialVolume={audioPrefs.volume}
          onAudioChange={(muted, volume) => setAudioPrefs({ muted, volume })}
        />
      </div>
    </div>
  );
}
