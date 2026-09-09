'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const FALLBACK_IMAGE = '/livestream-default.jpg';

export interface LiveCardProps {
  slug: string;
  name: string;
  location: string;
  status: 'live' | 'offline' | 'upcoming' | 'scheduled';
  previewImage?: string | null;
  // Human-readable "when to expect this" text — a recurring schedule
  // ("Saturdays at 9:00 AM") or a specific upcoming date/time. Mainly
  // useful for non-live cards so an offline channel still tells visitors
  // something actionable rather than just sitting there looking dead.
  scheduleText?: string | null;
}

export default function LiveCard({ slug, name, location, status, previewImage, scheduleText }: LiveCardProps) {
  // Starts from previewImage (or the placeholder if there isn't one), and
  // falls back to the placeholder again if that URL fails to actually
  // load — e.g. a Cloudflare-derived thumbnail URL that's well-formed but
  // has no real snapshot yet because the stream has never gone live. The
  // underlying data isn't wrong in that case, so this is a display-time
  // fix rather than something to chase at save time.
  const [imgSrc, setImgSrc] = useState(previewImage || FALLBACK_IMAGE);

  return (
    <Link
      href={`/watch/${slug}`}
      className="group block overflow-hidden rounded-lg border border-slate-200 transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        <div className="shimmer-bg absolute inset-0" />
        <Image
          src={imgSrc}
          alt={name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          onError={() => setImgSrc(FALLBACK_IMAGE)}
        />
        {status === 'live' ? (
          <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            LIVE
          </span>
        ) : (
          <span className="absolute top-2 left-2 rounded bg-slate-700/80 px-2 py-0.5 text-xs font-semibold uppercase text-white">
            {status}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-slate-900">{name}</p>
        <p className="text-sm text-slate-500">{location}</p>
        {scheduleText && <p className="mt-0.5 text-xs text-slate-400">{scheduleText}</p>}
      </div>
    </Link>
  );
}
