'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

interface ChannelPlayerProps {
  embedKey: string; // stable per actual segment occurrence — only this changing should ever reload the player
  embedUrl: string;
  provider: 'youtube' | 'cloudflare';
}

export default function ChannelPlayer({ embedKey, embedUrl, provider }: ChannelPlayerProps) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [current, setCurrent] = useState({ key: embedKey, url: embedUrl });

  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(70);
  const audioPrefs = useRef({ muted: true, volume: 70 });

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

  const applyAudio = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const { muted: isMuted, volume: vol } = audioPrefs.current;

    if (provider === 'youtube') {
      const send = (func: string, args: unknown[] = []) =>
        iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
      if (isMuted) {
        send('mute');
      } else {
        send('unMute');
        send('setVolume', [vol]);
      }
    } else {
      try {
        const player = (window as any).Stream?.(iframe);
        if (player) {
          player.muted = isMuted;
          player.volume = vol / 100;
        }
      } catch (err) {
        console.error('ChannelPlayer: Cloudflare audio control failed:', err);
      }
    }
  }, [provider]);

  function handleIframeLoad() {
    if (audioPrefs.current.muted) return;
    [500, 1500, 3000].forEach((delay) => setTimeout(applyAudio, delay));
  }

  function toggleMute() {
    const next = !audioPrefs.current.muted;
    audioPrefs.current.muted = next;
    setMuted(next);
    applyAudio();
  }

  function changeVolume(value: number) {
    audioPrefs.current.volume = value;
    setVolume(value);
    if (value > 0 && audioPrefs.current.muted) {
      audioPrefs.current.muted = false;
      setMuted(false);
    }
    applyAudio();
  }

  function goFullscreen() {
    containerRef.current?.requestFullscreen?.();
  }

  return (
    <div ref={containerRef} className="relative h-full w-full bg-black">
      {provider === 'cloudflare' && (
        <Script src="https://embed.cloudflarestream.com/embed/sdk.latest.js" strategy="afterInteractive" />
      )}

      <iframe
        ref={iframeRef}
        src={current.url}
        onLoad={handleIframeLoad}
        className="pointer-events-none h-full w-full"
        allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
      />

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
        <button
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
        >
          {muted || volume === 0 ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M23 9l-6 6M17 9l6 6" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14" />
            </svg>
          )}
        </button>

        <input
          type="range"
          min={0}
          max={100}
          value={muted ? 0 : volume}
          onChange={(e) => changeVolume(parseInt(e.target.value, 10))}
          aria-label="Volume"
          className="h-1 w-24 cursor-pointer accent-white sm:w-32"
        />

        {muted && <span className="text-xs font-medium text-white/90">Tap to unmute</span>}

        <button
          onClick={goFullscreen}
          aria-label="Fullscreen"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
