'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

export interface MapChurch {
  slug: string;
  name: string;
  town: string | null;
  latitude: number;
  longitude: number;
}

// Rough geographic center of Vanuatu/Solomon Islands/PNG/Fiji together,
// zoomed out enough to show the whole span at once.
const DEFAULT_CENTER: [number, number] = [-15, 165];
const DEFAULT_ZOOM = 4;

// A plain colored-dot marker via L.divIcon, not Leaflet's default pin
// image. Leaflet's default marker icon has a well-known bundler issue
// under webpack/Next.js (its image paths don't resolve correctly without
// extra config) — a divIcon sidesteps that entirely, and doubles as a
// simple way to keep the marker on-brand.
const churchIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#0284c7;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function PacificMap({ churches }: { churches: MapChurch[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    for (const church of churches) {
      L.marker([church.latitude, church.longitude], { icon: churchIcon })
        .addTo(map)
        .bindPopup(
          `<a href="/church/${church.slug}" style="font-weight:600;color:#0284c7;">${church.name}</a>` +
            (church.town ? `<br/><span style="color:#64748b;font-size:0.85em;">${church.town}</span>` : '')
        );
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="h-[600px] w-full rounded-lg" />;
}
