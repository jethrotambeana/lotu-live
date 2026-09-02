import { createClient } from '@/lib/supabaseServer';

export default async function AdminDashboard() {
  const supabase = createClient();

  const [{ count: churchCount }, { count: liveCount }, { count: pendingCount }, { count: messageCount }] =
    await Promise.all([
      supabase.from('churches').select('*', { count: 'exact', head: true }),
      supabase.from('livestreams').select('*', { count: 'exact', head: true }).eq('status', 'live'),
      supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('contacts').select('*', { count: 'exact', head: true }),
    ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Churches" value={churchCount ?? 0} />
        <StatCard label="Live Now" value={liveCount ?? 0} />
        <StatCard label="Pending Submissions" value={pendingCount ?? 0} />
        <StatCard label="Contact Messages" value={messageCount ?? 0} />
      </div>
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
