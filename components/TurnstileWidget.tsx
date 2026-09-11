'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

let callbackCounter = 0;

export default function TurnstileWidget({ onVerify }: { onVerify: (token: string) => void }) {
  // Unique per instance in case a page ever renders more than one widget
  // — unlikely today (one form per page), but avoids a silent collision
  // if that ever changes.
  const [callbackName] = useState(() => `onTurnstileVerify_${callbackCounter++}`);

  useEffect(() => {
    (window as any)[callbackName] = onVerify;
    return () => {
      delete (window as any)[callbackName];
    };
  }, [callbackName, onVerify]);

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div className="cf-turnstile" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} data-callback={callbackName} />
    </>
  );
}
