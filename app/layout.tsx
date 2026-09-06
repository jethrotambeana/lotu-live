import './globals.css';
import Link from 'next/link';
import Image from 'next/image';
import MobileNav from '@/components/MobileNav';

export const metadata = {
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
              <Image
                src="/logo-header.png"
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
          <Image
            src="/logo-footer.png"
            alt="LOTU.LIVE — Worship Together. Wherever You Are."
            width={800}
            height={533}
            className="mx-auto h-24 w-auto"
          />
          <p className="mt-4 text-sm text-slate-400">
            Vanuatu · Solomon Islands · Papua New Guinea · Fiji
          </p>
        </footer>
      </body>
    </html>
  );
}
