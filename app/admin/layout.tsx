import { requireAdmin } from '@/lib/requireAdmin';
import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

async function getPendingCounts() {
  const supabase = createClient();
  const [
    { count: pendingChurchSubs },
    { count: pendingEventSubs },
    { count: pendingMinistrySubs },
    { count: pendingEditors },
    { count: pendingEvents },
    { count: pendingVideos },
  ] = await Promise.all([
    supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('event_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('ministry_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'pending_editor'),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('approved', false),
    supabase.from('videos').select('*', { count: 'exact', head: true }).eq('approved', false),
  ]);

  return {
    submissions:
      (pendingChurchSubs ?? 0) + (pendingEventSubs ?? 0) + (pendingMinistrySubs ?? 0) + (pendingEditors ?? 0),
    events: pendingEvents ?? 0,
    videos: pendingVideos ?? 0,
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const counts = await getPendingCounts();

  const ADMIN_NAV = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/churches', label: 'Churches' },
    { href: '/admin/ministries', label: 'Ministries' },
    { href: '/admin/events', label: 'Events', badge: counts.events },
    { href: '/admin/livestreams', label: 'Livestreams' },
    { href: '/admin/videos', label: 'Videos', badge: counts.videos },
    { href: '/admin/messages', label: 'Messages' },
    { href: '/admin/submissions', label: 'Submissions', badge: counts.submissions },
    { href: '/admin/about', label: 'About Page' },
  ];

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8">
      <aside className="w-44 shrink-0">
        <nav className="space-y-1">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded px-3 py-2 text-sm hover:bg-slate-100"
            >
              <span>{item.label}</span>
              {!!item.badge && (
                <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {item.badge}
                </span>
              )}
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
