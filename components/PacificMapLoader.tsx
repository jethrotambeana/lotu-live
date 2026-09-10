'use client';

import dynamic from 'next/dynamic';
import type { MapChurch } from './PacificMap';

// ssr: false is only valid inside a Client Component in the App Router —
// this tiny wrapper exists solely to satisfy that constraint, since the
// actual map page (app/map/page.tsx) is a Server Component that fetches
// the church list. Leaflet touches `window`/`document` at module load
// time, which crashes during server rendering if not excluded this way.
const PacificMap = dynamic(() => import('./PacificMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] w-full items-center justify-center rounded-lg bg-slate-100 text-slate-400">
      Loading map…
    </div>
  ),
});

export default function PacificMapLoader({ churches, focusSlug }: { churches: MapChurch[]; focusSlug?: string }) {
  return <PacificMap churches={churches} focusSlug={focusSlug} />;
}
