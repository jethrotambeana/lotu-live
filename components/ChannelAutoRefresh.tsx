'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Periodically re-runs the server-rendered page so the channel naturally
// advances to the next scheduled video (or cuts to a stream that just
// went live) without the visitor reloading manually. 30 seconds is a
// deliberate trade-off: frequent enough that a live cutover or a
// video-end transition is never noticeably late, loose enough not to
// hammer the server while a segment still has minutes left to run.
export default function ChannelAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  return null;
}
