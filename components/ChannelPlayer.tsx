'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ChannelPlayerProps {
  embedKey: string; // stable per actual segment occurrence — only this changing should ever reload the player
  embedUrl: string;
}

export default function ChannelPlayer({ embedKey, embedUrl }: ChannelPlayerProps) {
  const router = useRouter();

  // The bug this fixes: naively re-rendering with a fresh server-computed
  // embedUrl every refresh caused the iframe to reload constantly, even
  // mid-video — because the recalculated elapsed-time offset produces a
  // slightly different `start=`/`startTime=` value each time, which the
  // browser treats as a brand new video source. This local state is only
  // updated when embedKey itself changes (a genuinely different video or
  // live stream), so the currently-playing iframe is left completely
  // alone in between — router.refresh() below still re-fetches fresh data
  // from the server every cycle, but that only actually reaches the
  // screen when something real changed.
  const [current, setCurrent] = useState({ key: embedKey, url: embedUrl });

  useEffect(() => {
    if (embedKey !== current.key) {
      setCurrent({ key: embedKey, url: embedUrl });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedKey, embedUrl]);

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 20000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <iframe
      src={current.url}
      className="h-full w-full"
      allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
}
