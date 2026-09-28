'use client';

import { useState } from 'react';

interface ShareButtonProps {
  url: string;
  title: string;
  className?: string;
}

// Uses the native share sheet where available (most mobile browsers, and
// some desktop ones) — this is the "Share" a person expects on a phone,
// offering WhatsApp/Messages/etc. directly. Falls back to copying the
// link to the clipboard everywhere else (most desktop browsers).
export default function ShareButton({ url, title, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        // AbortError just means the person closed the native share sheet
        // without picking anything — not a real failure, nothing to do.
        // Any other error falls through to the clipboard fallback below.
        if ((err as any)?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('ShareButton: clipboard copy failed:', err);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={
        className ??
        'flex items-center gap-1.5 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50'
      }
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5l6.8 3.9M15.4 6.6L8.6 10.5" />
      </svg>
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}
