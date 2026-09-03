'use client';

import { useState } from 'react';

export default function ShareButton({ title }: { title?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;

    // Prefer the native share sheet on devices that support it.
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, url });
        return;
      } catch {
        // User cancelled or the share sheet failed — fall back to copying.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — nothing more we can silently do here.
    }
  }

  return (
    <button
      onClick={handleShare}
      className="shrink-0 rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
    >
      {copied ? 'Link copied!' : 'Share'}
    </button>
  );
}
