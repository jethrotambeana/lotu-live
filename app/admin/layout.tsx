import { requireAdmin } from '@/lib/requireAdmin';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/messages', label: 'Messages' },
  { href: '/admin/submissions', label: 'Submissions' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // redirects if not logged in / not an admin

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8">
      <aside className="w-44 shrink-0">
        <nav className="space-y-1">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-3 py-2 text-sm hover:bg-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <LogoutButton />
        </div>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
