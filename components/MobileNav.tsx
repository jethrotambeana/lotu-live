'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface MobileNavProps {
  items: { href: string; label: string }[];
}

export default function MobileNav({ items }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded border border-slate-200"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        )}
      </button>

      {open && (
        // z-[2000] — deliberately well above z-50. Leaflet's own map
        // controls (zoom buttons, its internal panes) default to
        // z-index:1000, which sat above this dropdown on the /map page
        // specifically, since nothing else on the site previously used a
        // high z-index to conflict with. 2000 keeps this menu on top of
        // any current or future widget in that same range.
        <ul className="absolute left-0 right-0 top-full z-[2000] border-b border-slate-200 bg-white px-4 py-2 shadow-md">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="block border-b border-slate-100 py-3 text-sm last:border-b-0 hover:text-sky-600"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
