import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';

export default async function EventsPage() {
  const supabase = createClient();
  const { data: events } = await supabase
    .from('events')
    .select('slug, name, venue, town, start_date, end_date, status')
    .order('start_date', { ascending: true });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Events</h1>
      {events && events.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {events.map((e) => (
            <Link
              key={e.slug}
              href={`/event/${e.slug}`}
              className="block rounded border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <span className="text-xs font-semibold uppercase text-sky-600">{e.status}</span>
              <p className="font-medium">{e.name}</p>
              <p className="text-sm text-slate-500">
                {e.venue}, {e.town}
              </p>
              <p className="text-xs text-slate-400">
                {e.start_date} – {e.end_date}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-slate-500">No events scheduled yet — check back soon.</p>
      )}
    </div>
  );
}
