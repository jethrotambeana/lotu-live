import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import Image from 'next/image';
import FilterBar from '@/components/FilterBar';

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { country?: string; status?: string };
}) {
  const supabase = createClient();

  const { data: countries } = await supabase.from('countries').select('id, name').order('name');

  let query = supabase
    .from('events')
    .select('slug, name, venue, town, start_date, end_date, status, country_id, poster_url');

  if (searchParams.country) query = query.eq('country_id', searchParams.country);
  if (searchParams.status) query = query.eq('status', searchParams.status);

  const { data: events } = await query.order('start_date', { ascending: true });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Events</h1>

      <FilterBar
        filters={[
          {
            name: 'country',
            label: 'All Countries',
            options: (countries ?? []).map((c) => ({ value: c.id, label: c.name })),
          },
          {
            name: 'status',
            label: 'Any Status',
            options: [
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'current', label: 'Current' },
              { value: 'completed', label: 'Completed' },
            ],
          },
        ]}
      />

      {events && events.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {events.map((e) => (
            <Link
              key={e.slug}
              href={`/event/${e.slug}`}
              className="block overflow-hidden rounded border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-video bg-slate-100">
                {e.poster_url && <Image src={e.poster_url} alt={e.name} fill className="object-cover" />}
              </div>
              <div className="p-4">
                <span className="text-xs font-semibold uppercase text-sky-600">{e.status}</span>
                <p className="font-medium">{e.name}</p>
                <p className="text-sm text-slate-500">
                  {e.venue}, {e.town}
                </p>
                <p className="text-xs text-slate-400">
                  {e.start_date} – {e.end_date}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-slate-500">No events match these filters.</p>
      )}
    </div>
  );
}
