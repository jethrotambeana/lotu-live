import { requireEditor } from '@/lib/requireEditor';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const { scope } = await requireEditor();

  const nav = [
    { href: '/manage', label: scope.type === 'church' ? 'Church Profile' : 'Ministry Profile' },
    { href: '/manage/events', label: 'Events' },
    { href: '/manage/videos', label: 'Videos' },
  ];

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8">
      <aside className="w-44 shrink-0">
        <nav className="space-y-1">
          {nav.map((item) => (
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
