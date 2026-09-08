'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { extractYouTubeId, extractCloudflareId, CLOUDFLARE_CUSTOMER_CODE } from '@/lib/embed';

// videos.provider only ever holds these three (see the check constraint
// note in admin/videos/actions.ts) — a different, smaller set than
// lib/embed.ts's own Provider type (which covers livestreams' facebook/hls
// instead of cloudinary).
type VideoProvider = 'cloudflare' | 'youtube' | 'cloudinary';

const HOVER_DELAY_MS = 400;

// Builds a muted-autoplay, looping, chrome-stripped embed URL for the
// hover preview specifically — deliberately separate from lib/embed.ts's
// buildEmbed(), which is used for the real watch page and correctly
// defaults to autoplay=0 there. Nothing here changes that.
function buildPreviewEmbedSrc(provider: VideoProvider, providerVideoId: string): string | null {
  switch (provider) {
    case 'youtube': {
      const id = extractYouTubeId(providerVideoId);
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${encodeURIComponent(id)}`;
    }
    case 'cloudflare': {
      const id = extractCloudflareId(providerVideoId);
      return `https://customer-${CLOUDFLARE_CUSTOMER_CODE}.cloudflarestream.com/${encodeURIComponent(id)}/iframe?autoplay=true&muted=true&controls=false&loop=true`;
    }
    default:
      // No established inline-preview convention for Cloudinary yet — hover
      // just does nothing extra; the static thumbnail stays as-is.
      return null;
  }
}

export default function VideoThumbnail({
  thumbnail,
  title,
  provider,
  providerVideoId,
}: {
  thumbnail?: string | null;
  title: string;
  provider?: VideoProvider | null;
  providerVideoId?: string | null;
}) {
  const [previewing, setPreviewing] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // No real "hover" on touch devices — skip the preview entirely there
  // rather than risk it firing on a tap. Checked client-side only; server
  // render always shows the static thumbnail, which is also the correct
  // fallback if this check somehow doesn't run.
  useEffect(() => {
    setCanHover(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const previewSrc = provider && providerVideoId ? buildPreviewEmbedSrc(provider, providerVideoId) : null;
  const hoverEnabled = canHover && !!previewSrc;

  function handleEnter() {
    if (!hoverEnabled) return;
    // Debounced so quickly sweeping the mouse across a grid of cards
    // doesn't fire off a preview load for every thumbnail it passes over
    // — same pattern YouTube's own hover preview uses.
    timeoutRef.current = setTimeout(() => setPreviewing(true), HOVER_DELAY_MS);
  }

  function handleLeave() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // Unmounting the iframe (not just hiding it) actually stops playback
    // and any further loading — nothing keeps running in the background
    // once the mouse leaves.
    setPreviewing(false);
  }

  return (
    <div
      className="relative aspect-video overflow-hidden rounded bg-slate-100"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div className="shimmer-bg absolute inset-0" />
      {thumbnail && (
        <Image src={thumbnail} alt={title} fill className="object-cover transition-transform duration-300 group-hover:scale-110" />
      )}
      {previewing && previewSrc && (
        <iframe
          src={previewSrc}
          // pointer-events-none is the actual fix: the embed (YouTube in
          // particular) still renders its own clickable watermark/logo
          // even with controls=0, and an iframe always intercepts clicks
          // within its bounds regardless of what's stacked underneath it.
          // This preview is meant to be a purely decorative ambient loop,
          // not an interactive mini-player, so making it click-through
          // lets clicks fall through to the surrounding <Link> and
          // reliably navigate to the video's own page on this site
          // instead of occasionally opening YouTube directly.
          className="pointer-events-none absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media"
          tabIndex={-1}
          title={`${title} preview`}
        />
      )}
    </div>
  );
}
