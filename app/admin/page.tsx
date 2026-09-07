import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';

export default async function AdminDashboard() {
  const supabase = createClient();

  const [
    { count: churchCount },
    { count: liveCount },
    { count: messageCount },
    { count: pendingChurchSubs },
    { count: pendingEventSubs },
    { count: pendingMinistrySubs },
    { count: pendingEditors },
    { count: pendingEvents },
    { count: pendingVideos },
  ] = await Promise.all([
    supabase.from('churches').select('*', { count: 'exact', head: true }),
    supabase.from('livestreams').select('*', { count: 'exact', head: true }).eq('status', 'live'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('event_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('ministry_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'pending_editor'),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('approved', false),
    supabase.from('videos').select('*', { count: 'exact', head: true }).eq('approved', false),
  ]);

  // Previously this card only ever counted the `submissions` (church) table,
  // silently missing event/ministry submissions entirely. Now combines all
  // three staging tables — matches what Admin → Submissions actually shows.
  const newSubmissions = (pendingChurchSubs ?? 0) + (pendingEventSubs ?? 0) + (pendingMinistrySubs ?? 0);
  const needsAttention = newSubmissions + (pendingEditors ?? 0) + (pendingEvents ?? 0) + (pendingVideos ?? 0);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>

      {needsAttention > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700">
            Needs Your Attention
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <AttentionCard label="New Submissions" value={newSubmissions} href="/admin/submissions" />
            <AttentionCard
              label="Pending Editor Activations"
              value={pendingEditors ?? 0}
              href="/admin/submissions"
            />
            <AttentionCard
              label="Events Awaiting Re-approval"
              value={pendingEvents ?? 0}
              href="/admin/events"
            />
            <AttentionCard
              label="Videos Awaiting Re-approval"
              value={pendingVideos ?? 0}
              href="/admin/videos"
            />
          </div>
        </div>
      )}

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Overview</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Churches" value={churchCount ?? 0} />
        <StatCard label="Live Now" value={liveCount ?? 0} />
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

function AttentionCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className={`rounded border p-4 transition-colors ${
        value > 0 ? 'border-amber-300 bg-amber-50 hover:bg-amber-100' : 'border-slate-200 hover:bg-slate-50'
      }`}
    >
      <p className={`text-2xl font-bold ${value > 0 ? 'text-amber-700' : ''}`}>{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </Link>
  );
}
