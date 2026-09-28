'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';

interface ChannelPlayerProps {
  embedKey: string; // stable per actual segment occurrence — only this changing should ever reload the player
  embedUrl: string;
  provider: 'youtube' | 'cloudflare';
}

// How long the control bar stays visible after the mouse stops moving over
// the player, before it fades out again (touch: after a tap).
const CONTROLS_HIDE_DELAY_MS = 2500;

// Absolute ceiling on how long the "starting up" cover can stay up, in case
// the real playback-state events below never arrive (script blocked,
// browser quirk, etc). Under normal conditions the cover comes down as soon
// as a genuine "now playing" event is seen — this is just a safety net so
// nobody is ever stuck staring at a black screen indefinitely.
const STARTUP_COVER_MAX_MS = 8000;

// Retries for applying the viewer's mute/volume choice — both providers'
// control APIs (YouTube's postMessage handshake, Cloudflare's Stream SDK
// script) can still be finishing initialization at the exact moment a
// viewer clicks unmute or drags the slider, and a single attempt can
// silently do nothing if that happens. Retrying a few times over ~2s
// covers that without needing to detect "is it ready yet" precisely.
const AUDIO_RETRY_DELAYS_MS = [0, 300, 800, 1500, 3000];

// YouTube's own numeric player states (same values YT.PlayerState uses):
// -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued.
const YT_STATE_PLAYING = 1;

export default function ChannelPlayer({ embedKey, embedUrl, provider }: ChannelPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startupFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudflareAttachTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRetryTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(70);
  const audioPrefs = useRef({ muted: true, volume: 70 });

  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // True whenever the player isn't confirmed to be genuinely playing —
  // covers the initial YouTube/Cloudflare branding flash AND any later
  // re-buffer/restart, since it's driven by real state, not a timer.
  const [isStarting, setIsStarting] = useState(true);

  // This component is now given a fresh `key={embedKey}` by its parent
  // (ChannelClient) whenever the segment/live stream actually changes, so
  // it fully remounts at that point — there's no longer any need to track
  // "did embedKey change" internally, and no risk of a stale src lingering.

  function armStartupFallback() {
    setIsStarting(true);
    if (startupFallbackTimer.current) clearTimeout(startupFallbackTimer.current);
    startupFallbackTimer.current = setTimeout(() => setIsStarting(false), STARTUP_COVER_MAX_MS);
  }

  useEffect(() => {
    armStartupFallback();
    return () => {
      if (startupFallbackTimer.current) clearTimeout(startupFallbackTimer.current);
      if (cloudflareAttachTimer.current) clearTimeout(cloudflareAttachTimer.current);
      audioRetryTimers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tracks real fullscreen state (rather than assuming the button's own
  // click toggled it) so the icon/label stay correct even if the viewer
  // exits fullscreen via Escape or a mobile back gesture instead of the
  // button itself.
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // --- Real playback-state tracking (drives the startup/re-init cover) ---
  //
  // YouTube: with enablejsapi=1 in the embed URL, the iframe broadcasts its
  // player state to window.parent via postMessage once it sees the parent
  // is listening — the same lightweight handshake YouTube's own player
  // library performs internally. No extra script needed for this.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (provider !== 'youtube') return;
      if (typeof event.data !== 'string') return;
      let data: any;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      const state =
        data?.event === 'onStateChange'
          ? data.info
          : data?.event === 'infoDelivery'
          ? data.info?.playerState
          : undefined;
      if (typeof state !== 'number') return;

      if (state === YT_STATE_PLAYING) {
        setIsStarting(false);
      } else {
        // Buffering, unstarted, cued, paused, ended — treat all of these as
        // "not really playing" and keep the cover up.
        setIsStarting(true);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [provider]);

  // Cloudflare Stream's player object behaves like a normal HTMLMediaElement
  // and fires real 'playing' / 'waiting' events — attach once the SDK
  // script has actually finished loading (polls briefly since the script
  // loads async and may not be ready the instant this component mounts).
  useEffect(() => {
    if (provider !== 'cloudflare') return;

    function tryAttach() {
      const iframe = iframeRef.current;
      const player = iframe && (window as any).Stream?.(iframe);
      if (player && typeof player.addEventListener === 'function') {
        player.addEventListener('playing', () => setIsStarting(false));
        player.addEventListener('waiting', () => setIsStarting(true));
        player.addEventListener('pause', () => setIsStarting(true));
      } else {
        cloudflareAttachTimer.current = setTimeout(tryAttach, 200);
      }
    }
    tryAttach();

    return () => {
      if (cloudflareAttachTimer.current) clearTimeout(cloudflareAttachTimer.current);
    };
  }, [provider]);

  // Sends the handshake YouTube's iframe needs in order to start
  // broadcasting onStateChange/infoDelivery messages to this window.
  function sendYouTubeListeningHandshake() {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: embedKey }), '*');
  }

  const scheduleHideControls = useCallback(() => {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => setShowControls(false), CONTROLS_HIDE_DELAY_MS);
  }, []);

  function handlePointerActivity() {
    if (isStarting) return; // ignore hover/tap while the startup cover is still up
    setShowControls(true);
    scheduleHideControls();
  }

  function handleMouseLeave() {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    setShowControls(false);
  }

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, []);

  const applyAudioOnce = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return false;
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
      // No reliable synchronous confirmation that this landed — the retry
      // schedule below covers that instead of trying to detect success here.
      return true;
    }

    try {
      const player = (window as any).Stream?.(iframe);
      if (!player) return false;
      player.muted = isMuted;
      player.volume = vol / 100;
      return true;
    } catch (err) {
      console.error('ChannelPlayer: Cloudflare audio control failed:', err);
      return false;
    }
  }, [provider]);

  // Fires applyAudioOnce() immediately and again on a short retry schedule,
  // so a click that lands before the provider's control API has finished
  // initializing still ends up applied instead of silently doing nothing.
  const applyAudioWithRetries = useCallback(() => {
    audioRetryTimers.current.forEach(clearTimeout);
    audioRetryTimers.current = AUDIO_RETRY_DELAYS_MS.map((delay) => setTimeout(applyAudioOnce, delay));
  }, [applyAudioOnce]);

  function handleIframeLoad() {
    if (provider === 'youtube') {
      sendYouTubeListeningHandshake();
      setTimeout(sendYouTubeListeningHandshake, 500);
    }
    // Re-applies the viewer's existing mute/volume choice on every fresh
    // load — relevant when this component remounts for a new segment/live
    // stream (see the `key={embedKey}` on the parent's usage) and the
    // viewer had already unmuted before the switch.
    if (!audioPrefs.current.muted) {
      applyAudioWithRetries();
    }
  }

  function toggleMute() {
    const next = !audioPrefs.current.muted;
    audioPrefs.current.muted = next;
    setMuted(next);
    applyAudioWithRetries();
  }

  function changeVolume(value: number) {
    audioPrefs.current.volume = value;
    setVolume(value);
    if (value > 0 && audioPrefs.current.muted) {
      audioPrefs.current.muted = false;
      setMuted(false);
    }
    applyAudioWithRetries();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      containerRef.current?.requestFullscreen?.();
    }
  }

  return (
    <div
      ref={containerRef}
      className="group relative h-full w-full bg-black"
      onMouseMove={handlePointerActivity}
      onMouseLeave={handleMouseLeave}
      onClick={handlePointerActivity}
    >
      {provider === 'cloudflare' && (
        <Script src="https://embed.cloudflarestream.com/embed/sdk.latest.js" strategy="afterInteractive" />
      )}

      <iframe
        ref={iframeRef}
        src={embedUrl}
        onLoad={handleIframeLoad}
        className="pointer-events-none h-full w-full"
        allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
      />

      {/* Startup/re-init cover: hides YouTube/Cloudflare's own branding
          overlay and any black re-init flash, driven by real playback
          state rather than a guessed timer. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black transition-opacity duration-500 ${
          isStarting ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </div>

      {!isStarting && (
        <div
          className={`absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
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
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
          >
            {isFullscreen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 3v3a2 2 0 01-2 2H4M15 3v3a2 2 0 002 2h3M9 21v-3a2 2 0 00-2-2H4M15 21v-3a2 2 0 012-2h3" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
