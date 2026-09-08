import './globals.css';
import './animations.css';
import Link from 'next/link';
import Image from 'next/image';
import MobileNav from '@/components/MobileNav';

export const metadata = {
  metadataBase: new URL('https://lotu.live'),
  title: 'LOTU.LIVE — The Pacific Gospel Media Network',
  description:
    'Watch live worship, evangelism, youth programs and Christian media from Seventh-day Adventist churches across Vanuatu, Solomon Islands, Papua New Guinea and Fiji.',
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
        <header className="relative border-b border-slate-200">
          <nav className="mx-auto flex max-w-6xl items-center justify-between p-4">
            <Link href="/" className="flex items-center">
              {/* "?v=2" cache-busts Next's image optimizer, which caches
                  transformed images by URL rather than content and does not
                  invalidate that cache on redeploy. If logo-header.png is
                  ever replaced again, bump this to "?v=3" (etc.) or the old
                  image may keep being served regardless of what's actually
                  in the file. */}
              <Image
                src="/logo-header.png?v=2"
                alt="LOTU.LIVE"
                width={600}
                height={369}
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
            <MobileNav items={NAV} />
          </nav>
        </header>
        <main>{children}</main>
        <footer className="mt-12 bg-black py-10 text-center">
          {/* Same cache-bust as the header logo above — see that comment. */}
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
