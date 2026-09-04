import { requireChurchEditor } from '@/lib/requireChurchEditor';
import Link from 'next/link';
import { deleteMyEvent } from './actions';

export default async function ManageEventsPage() {
  const { supabase, churchId } = await requireChurchEditor();
  const { data: events } = await supabase
    .from('events')
    .select('id, name, status, start_date, town, approved')
    .eq('host_church_id', churchId)
    .order('start_date', { ascending: true });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Events</h1>
        <Link href="/manage/events/edit" className="rounded bg-sky-600 px-4 py-2 text-sm text-white">
          + Add Event
        </Link>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        New events and any edits go live only after an admin approves them.
      </p>
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
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/manage/events/edit?id=${e.id}`} className="text-sm text-sky-600 underline">
                Edit
              </Link>
              <form action={deleteMyEvent}>
                <input type="hidden" name="id" value={e.id} />
                <button className="text-sm text-red-600 underline">Delete</button>
              </form>
            </div>
          </div>
        ))}
        {(!events || events.length === 0) && (
          <p className="text-slate-500">No events yet — click "Add Event" to create one.</p>
        )}
      </div>
    </div>
  );
}

