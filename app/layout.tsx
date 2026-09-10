import type { Metadata, Viewport } from 'next';
import './globals.css';
import './animations.css';
import Link from 'next/link';
import Image from 'next/image';
import MobileNav from '@/components/MobileNav';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

const SITE_TITLE = 'LOTU.LIVE — The Pacific Gospel Media Network';
const SITE_DESCRIPTION =
  'Watch live worship, evangelism, youth programs and Christian media from Seventh-day Adventist churches across Vanuatu, Solomon Islands, Papua New Guinea and Fiji.';

export const metadata: Metadata = {
  metadataBase: new URL('https://lotu.live'),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lotu.live',
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: '/hero-banner.jpg', width: 2046, height: 768 }],
    type: 'website',
    siteName: 'LOTU.LIVE',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/hero-banner.jpg'],
  },
};

// Next.js 14 moved themeColor out of the `metadata` export into a
// separate `viewport` export — leaving it in `metadata` still "works" but
// prints a deprecation warning during build.
export const viewport: Viewport = {
  themeColor: '#0284c7',
};

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/live', label: 'Watch Live' },
  { href: '/churches', label: 'Churches' },
  { href: '/ministries', label: 'Ministries' },
  { href: '/events', label: 'Events' },
  { href: '/videos', label: 'Videos' },
  { href: '/countries', label: 'Countries' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900">
        <ServiceWorkerRegister />
        <header className="relative border-b border-slate-200">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 p-4">
            <Link href="/" className="flex shrink-0 items-center">
              {/* "?v=3" cache-busts Next's image optimizer, which caches
                  transformed images by URL rather than content and does not
                  invalidate that cache on redeploy. If logo-header.png is
                  ever replaced again, bump this to "?v=4" (etc.) or the old
                  image may keep being served regardless of what's actually
                  in the file. */}
              <Image
                src="/logo-header.png?v=3"
                alt="LOTU.LIVE"
                width={600}
                height={400}
                priority
                className="h-14 w-auto"
              />
            </Link>
            <ul className="hidden gap-5 text-sm md:flex">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-sky-600">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <form action="/search" method="get" className="flex items-center">
              <input
                type="search"
                name="q"
                placeholder="Search..."
                aria-label="Search"
                className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm sm:w-40"
              />
            </form>
            <MobileNav items={NAV} />
          </nav>
        </header>
        <main>{children}</main>
        <footer className="mt-12 bg-black py-10 text-center">
          {/* Untouched — this is a deliberately different white-on-black
              recolor, not the same artwork with transparency, and stays
              as-is. */}
          <Image
            src="/logo-footer.png?v=2"
            alt="LOTU.LIVE — Worship Together. Wherever You Are."
            width={800}
            height={533}
            className="mx-auto h-24 w-auto"
          />
          <p className="mt-4 text-sm text-slate-400">The Pacific Gospel Media Network</p>
          <p className="mt-1 text-sm text-slate-400">Connecting the Pacific through Gospel Media</p>
        </footer>
      </body>
    </html>
  );
}
