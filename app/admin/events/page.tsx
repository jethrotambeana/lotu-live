import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { deleteEvent } from './actions';

export default async function AdminEventsPage() {
  const supabase = createClient();
  const { data: events } = await supabase
    .from('events')
    .select('id, name, status, start_date, town')
    .order('start_date', { ascending: true });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <Link href="/admin/events/edit" className="rounded bg-sky-600 px-4 py-2 text-sm text-white">
          + Add Event
        </Link>
      </div>
      <div className="space-y-2">
        {(events ?? []).map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded border border-slate-200 p-3">
            <div>
              <span className="mr-2 text-xs font-semibold uppercase text-sky-600">{e.status}</span>
              <span className="font-medium">{e.name}</span>
              <p className="text-sm text-slate-500">
                {e.town} — {e.start_date}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/events/edit?id=${e.id}`} className="text-sm text-sky-600 underline">
                Edit
              </Link>
              <form action={deleteEvent}>
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
