import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

export default async function AdminDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  if (!profile || profile.role !== 'admin') {
    redirect('/'); // not authorized — send back to the public site
  }

  const [{ count: churchCount }, { count: liveCount }, { count: pendingCount }] = await Promise.all([
    supabase.from('churches').select('*', { count: 'exact', head: true }),
    supabase.from('livestreams').select('*', { count: 'exact', head: true }).eq('status', 'live'),
    supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Churches" value={churchCount ?? 0} />
        <StatCard label="Live Now" value={liveCount ?? 0} />
        <StatCard label="Pending Submissions" value={pendingCount ?? 0} />
      </div>
      {/* Sub-nav to /admin/livestreams, /admin/churches, /admin/events,
          /admin/videos, /admin/submissions, /admin/settings, etc. */}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-slate-200 p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
