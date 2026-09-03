import { createClient } from '@/lib/supabaseServer';
import { approveSubmission, rejectSubmission } from './actions';

export default async function AdminSubmissionsPage() {
  const supabase = createClient();
  const { data: submissions } = await supabase
    .from('submissions')
    .select('*, countries(name)')
    .order('created_at', { ascending: false });

  // For approved submissions, look up whether an editor account ended up
  // linked with a matching email, purely for admin visibility — this
  // doesn't affect anything, it just surfaces cases that may need a manual
  // SQL link if the submitter didn't have an account yet at approval time.
  const emails = (submissions ?? []).map((s: any) => s.email).filter(Boolean);
  const { data: linkedProfiles } =
    emails.length > 0
      ? await supabase.from('profiles').select('email, role, church_id').in('email', emails)
      : { data: [] as any[] };

  function editorStatus(email: string | null) {
    if (!email) return null;
    const match = (linkedProfiles ?? []).find(
      (p: any) => p.email?.toLowerCase() === email.toLowerCase()
    );
    if (match && match.role === 'editor' && match.church_id) return 'linked';
    if (match) return 'account exists, not linked';
    return 'no account yet';
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Church Submissions</h1>
      {submissions && submissions.length > 0 ? (
        <div className="space-y-4">
          {submissions.map((s: any) => (
            <div key={s.id} className="rounded border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{s.church_name}</p>
                <span
                  className={`text-xs font-semibold uppercase ${
                    s.status === 'pending'
                      ? 'text-amber-600'
                      : s.status === 'approved'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <p className="text-sm text-slate-500">
                {s.countries?.name} {s.island_province ? `— ${s.island_province}` : ''}{' '}
                {s.location ? `— ${s.location}` : ''}
              </p>
              <p className="text-sm text-slate-500">
                Contact: {s.contact_name} · {s.email} · {s.phone}
              </p>
              {s.livestream_ref && (
                <p className="text-sm text-slate-500">Stream: {s.livestream_ref}</p>
              )}
              {s.status === 'approved' && (
                <p className="mt-1 text-xs text-slate-400">
                  Editor access: {editorStatus(s.email)}
                  {editorStatus(s.email) !== 'linked' &&
                    ' — link manually via SQL if this church needs a self-service editor (see Admin Guide).'}
                </p>
              )}
              {s.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <form action={approveSubmission}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="rounded bg-green-600 px-3 py-1 text-sm text-white">
                      Approve
                    </button>
                  </form>
                  <form action={rejectSubmission}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="rounded border border-slate-300 px-3 py-1 text-sm">
                      Reject
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-500">No submissions yet.</p>
      )}
    </div>
  );
}
