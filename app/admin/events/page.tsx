import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { deleteEvent, toggleEventApproved } from './actions';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import FilterBar from '@/components/FilterBar';

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: { error?: string; church?: string; ministry?: string };
}) {
  const supabase = createClient();

  const [{ data: churches }, { data: ministries }] = await Promise.all([
    supabase.from('churches').select('id, name').order('name'),
    supabase.from('ministries').select('id, name').order('name'),
  ]);

  let query = supabase
    .from('events')
    .select('id, name, status, start_date, town, churches(name), ministries(name), approved');

  if (searchParams.church) query = query.eq('host_church_id', searchParams.church);
  if (searchParams.ministry) query = query.eq('host_ministry_id', searchParams.ministry);

  const { data: events } = await query
    .order('approved', { ascending: true }) // pending-approval rows (approved = false) surface first
    .order('start_date', { ascending: true });

  const pendingCount = (events ?? []).filter((e: any) => !e.approved).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <Link href="/admin/events/edit" className="rounded bg-sky-600 px-4 py-2 text-sm text-white">
          + Add Event
        </Link>
      </div>
      {searchParams.error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}
      {pendingCount > 0 && (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {pendingCount} event{pendingCount === 1 ? '' : 's'} awaiting approval — shown first in the list below.
        </div>
      )}

      <FilterBar
        filters={[
          {
            name: 'church',
            label: 'All Churches',
            options: (churches ?? []).map((c) => ({ value: c.id, label: c.name })),
          },
          {
            name: 'ministry',
            label: 'All Ministries',
            options: (ministries ?? []).map((m) => ({ value: m.id, label: m.name })),
          },
        ]}
      />

      <div className="space-y-2">
        {(events ?? []).map((e: any) => (
          <div key={e.id} className="flex items-center justify-between rounded border border-slate-200 p-3">
            <div>
              <span className="mr-2 text-xs font-semibold uppercase text-sky-600">{e.status}</span>
              {!e.approved && (
                <span className="mr-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase text-amber-700">
                  Pending Approval
                </span>
              )}
              <span className="font-medium">{e.name}</span>
              <p className="text-sm text-slate-500">
                {e.town} — {e.start_date}
                {e.churches?.name ? ` · Hosted by ${e.churches.name}` : ''}
                {e.ministries?.name ? ` · Hosted by ${e.ministries.name}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <form action={toggleEventApproved}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="approved" value={String(e.approved)} />
                <button className="text-sm underline">{e.approved ? 'Unapprove' : 'Approve'}</button>
              </form>
              <Link href={`/admin/events/edit?id=${e.id}`} className="text-sm text-sky-600 underline">
                Edit
              </Link>
              <form action={deleteEvent}>
                <input type="hidden" name="id" value={e.id} />
                <ConfirmSubmitButton
                  confirmMessage={`Delete "${e.name}"? This can't be undone.`}
                  className="text-sm text-red-600 underline"
                >
                  Delete
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>
        ))}
        {(!events || events.length === 0) && (
          <p className="text-slate-500">
            {searchParams.church || searchParams.ministry
              ? 'No events match these filters.'
              : 'No events yet — click "Add Event" to create one.'}
          </p>
        )}
      </div>
    </div>
  );
}
