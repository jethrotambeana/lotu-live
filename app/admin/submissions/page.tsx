import { createClient } from '@/lib/supabaseServer';
import {
  approveSubmission,
  rejectSubmission,
  approveEventSubmission,
  rejectEventSubmission,
  approveMinistrySubmission,
  rejectMinistrySubmission,
  activateEditor,
} from './actions';

const MINISTRY_TYPE_LABELS: Record<string, string> = {
  music_singing: 'Music / Singing',
  media_video: 'Media / Video',
  livestream_team: 'Livestream Team',
  youth: 'Youth',
  outreach: 'Outreach',
  prayer: 'Prayer',
  childrens: "Children's",
  other: 'Other',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs font-semibold uppercase ${
        status === 'pending' ? 'text-amber-600' : status === 'approved' ? 'text-green-600' : 'text-red-600'
      }`}
    >
      {status}
    </span>
  );
}

// Pending submissions always show directly; approved/rejected ones are
// tucked behind a native <details> disclosure per category so a category
// with a long history doesn't push everything else down the page. No
// client JS needed — <details> handles the toggle natively.
function splitByStatus<T extends { status: string }>(rows: T[]) {
  return {
    pending: rows.filter((r) => r.status === 'pending'),
    reviewed: rows.filter((r) => r.status !== 'pending'),
  };
}

export default async function AdminSubmissionsPage() {
  const supabase = createClient();

  const [{ data: submissionsRaw }, { data: eventSubmissionsRaw }, { data: ministrySubmissionsRaw }, { data: pendingEditors }] =
    await Promise.all([
      supabase.from('submissions').select('*, countries(name)').order('created_at', { ascending: false }),
      supabase
        .from('event_submissions')
        .select('*, countries(name), churches(name), ministries(name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('ministry_submissions')
        .select('*, countries(name), churches(name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, email, church_id, ministry_id, churches(name), ministries(name)')
        .eq('role', 'pending_editor'),
    ]);

  const { pending: pendingChurch, reviewed: reviewedChurch } = splitByStatus(submissionsRaw ?? []);
  const { pending: pendingEvent, reviewed: reviewedEvent } = splitByStatus(eventSubmissionsRaw ?? []);
  const { pending: pendingMinistry, reviewed: reviewedMinistry } = splitByStatus(ministrySubmissionsRaw ?? []);

  // For approved church/ministry submissions, look up whether a matching
  // account ended up linked, purely for admin visibility.
  const emails = [
    ...(submissionsRaw ?? []).map((s: any) => s.email),
    ...(ministrySubmissionsRaw ?? []).map((s: any) => s.email),
  ].filter(Boolean);
  const { data: linkedProfiles } =
    emails.length > 0
      ? await supabase.from('profiles').select('email, role, church_id, ministry_id').in('email', emails)
      : { data: [] as any[] };

  function editorStatus(email: string | null) {
    if (!email) return null;
    const match = (linkedProfiles ?? []).find((p: any) => p.email?.toLowerCase() === email.toLowerCase());
    if (match && match.role === 'editor' && (match.church_id || match.ministry_id)) return 'active';
    if (match && match.role === 'pending_editor') return 'awaiting admin activation';
    if (match) return 'account exists, not linked';
    return 'no account yet';
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Submissions</h1>
      <p className="mb-6 text-xs text-slate-400">
        Approved/rejected submissions are automatically removed 60 days after review.
      </p>

      {pendingEditors && pendingEditors.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Pending Editor Activations</h2>
          <div className="space-y-3">
            {pendingEditors.map((p: any) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded border border-amber-200 bg-amber-50 p-3"
              >
                <div>
                  <p className="font-medium">{p.email}</p>
                  <p className="text-sm text-slate-600">
                    Requesting editor access to{' '}
                    {p.ministry_id ? p.ministries?.name || 'a ministry' : p.churches?.name || 'a church'}
                  </p>
                </div>
                <form action={activateEditor}>
                  <input type="hidden" name="profileId" value={p.id} />
                  <button className="rounded bg-green-600 px-3 py-1 text-sm text-white">Activate</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Church Submissions */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Church Submissions</h2>
        <div className="space-y-4">
          {pendingChurch.map((s: any) => (
            <div key={s.id} className="rounded border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{s.church_name}</p>
                <StatusBadge status={s.status} />
              </div>
              <p className="text-sm text-slate-500">
                {s.countries?.name} {s.island_province ? `— ${s.island_province}` : ''}{' '}
                {s.location ? `— ${s.location}` : ''}
              </p>
              <p className="text-sm text-slate-500">
                Contact: {s.contact_name} · {s.email} · {s.phone}
              </p>
              <div className="mt-3 flex gap-2">
                <form action={approveSubmission}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="rounded bg-green-600 px-3 py-1 text-sm text-white">Approve</button>
                </form>
                <form action={rejectSubmission}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="rounded border border-slate-300 px-3 py-1 text-sm">Reject</button>
                </form>
              </div>
            </div>
          ))}
          {pendingChurch.length === 0 && reviewedChurch.length === 0 && (
            <p className="text-slate-500">No church submissions yet.</p>
          )}
          {reviewedChurch.length > 0 && (
            <details className="rounded border border-slate-200">
              <summary className="cursor-pointer p-3 text-sm font-medium text-slate-600">
                Show {reviewedChurch.length} reviewed submission{reviewedChurch.length === 1 ? '' : 's'}
              </summary>
              <div className="space-y-4 p-4 pt-0">
                {reviewedChurch.map((s: any) => (
                  <div key={s.id} className="rounded border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{s.church_name}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-sm text-slate-500">
                      {s.countries?.name} {s.island_province ? `— ${s.island_province}` : ''}{' '}
                      {s.location ? `— ${s.location}` : ''}
                    </p>
                    <p className="text-sm text-slate-500">
                      Contact: {s.contact_name} · {s.email} · {s.phone}
                    </p>
                    {s.status === 'approved' && (
                      <p className="mt-1 text-xs text-slate-400">
                        Editor access: {editorStatus(s.email)}
                        {editorStatus(s.email) === 'no account yet' &&
                          ' — link manually via SQL if this church needs a self-service editor (see Admin Guide).'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </section>

      {/* Event Submissions */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Event Submissions</h2>
        <div className="space-y-4">
          {pendingEvent.map((s: any) => (
            <div key={s.id} className="rounded border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{s.event_name}</p>
                <StatusBadge status={s.status} />
              </div>
              <p className="text-sm text-slate-500">
                {s.venue}, {s.town} — {s.start_date}
                {s.end_date ? ` to ${s.end_date}` : ''}
              </p>
              <p className="text-sm text-slate-500">
                Hosted by: {s.churches?.name || s.ministries?.name || s.hosted_by || 'Independent organizer'}
              </p>
              <p className="text-sm text-slate-500">
                Contact: {s.contact_name} · {s.email} · {s.phone}
              </p>
              <div className="mt-3 flex gap-2">
                <form action={approveEventSubmission}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="rounded bg-green-600 px-3 py-1 text-sm text-white">Approve</button>
                </form>
                <form action={rejectEventSubmission}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="rounded border border-slate-300 px-3 py-1 text-sm">Reject</button>
                </form>
              </div>
            </div>
          ))}
          {pendingEvent.length === 0 && reviewedEvent.length === 0 && (
            <p className="text-slate-500">No event submissions yet.</p>
          )}
          {reviewedEvent.length > 0 && (
            <details className="rounded border border-slate-200">
              <summary className="cursor-pointer p-3 text-sm font-medium text-slate-600">
                Show {reviewedEvent.length} reviewed submission{reviewedEvent.length === 1 ? '' : 's'}
              </summary>
              <div className="space-y-4 p-4 pt-0">
                {reviewedEvent.map((s: any) => (
                  <div key={s.id} className="rounded border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{s.event_name}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-sm text-slate-500">
                      {s.venue}, {s.town} — {s.start_date}
                      {s.end_date ? ` to ${s.end_date}` : ''}
                    </p>
                    <p className="text-sm text-slate-500">
                      Hosted by: {s.churches?.name || s.ministries?.name || s.hosted_by || 'Independent organizer'}
                    </p>
                    <p className="text-sm text-slate-500">
                      Contact: {s.contact_name} · {s.email} · {s.phone}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </section>

      {/* Ministry Submissions */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Ministry Submissions</h2>
        <div className="space-y-4">
          {pendingMinistry.map((s: any) => (
            <div key={s.id} className="rounded border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{s.ministry_name}</p>
                <StatusBadge status={s.status} />
              </div>
              <p className="text-sm text-slate-500">
                {MINISTRY_TYPE_LABELS[s.type] || s.type}
                {s.churches?.name ? ` · Part of ${s.churches.name}` : ' · Independent'}
              </p>
              <p className="text-sm text-slate-500">
                Contact: {s.contact_name} · {s.email} · {s.phone}
              </p>
              <div className="mt-3 flex gap-2">
                <form action={approveMinistrySubmission}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="rounded bg-green-600 px-3 py-1 text-sm text-white">Approve</button>
                </form>
                <form action={rejectMinistrySubmission}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="rounded border border-slate-300 px-3 py-1 text-sm">Reject</button>
                </form>
              </div>
            </div>
          ))}
          {pendingMinistry.length === 0 && reviewedMinistry.length === 0 && (
            <p className="text-slate-500">No ministry submissions yet.</p>
          )}
          {reviewedMinistry.length > 0 && (
            <details className="rounded border border-slate-200">
              <summary className="cursor-pointer p-3 text-sm font-medium text-slate-600">
                Show {reviewedMinistry.length} reviewed submission{reviewedMinistry.length === 1 ? '' : 's'}
              </summary>
              <div className="space-y-4 p-4 pt-0">
                {reviewedMinistry.map((s: any) => (
                  <div key={s.id} className="rounded border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{s.ministry_name}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-sm text-slate-500">
                      {MINISTRY_TYPE_LABELS[s.type] || s.type}
                      {s.churches?.name ? ` · Part of ${s.churches.name}` : ' · Independent'}
                    </p>
                    <p className="text-sm text-slate-500">
                      Contact: {s.contact_name} · {s.email} · {s.phone}
                    </p>
                    {s.status === 'approved' && (
                      <p className="mt-1 text-xs text-slate-400">
                        Editor access: {editorStatus(s.email)}
                        {editorStatus(s.email) === 'no account yet' &&
                          ' — link manually via SQL if this ministry needs a self-service editor (see Admin Guide).'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </section>
    </div>
  );
}
