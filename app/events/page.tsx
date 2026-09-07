import { createClient } from '@/lib/supabaseServer';
import EventCard from '@/components/EventCard';
import FilterBar from '@/components/FilterBar';

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { country?: string; status?: string; church?: string; ministry?: string };
}) {
  const supabase = createClient();

  const [{ data: countries }, { data: churches }, { data: ministries }] = await Promise.all([
    supabase.from('countries').select('id, name').order('name'),
    supabase.from('churches').select('id, name').order('name'),
    supabase.from('ministries').select('id, name').order('name'),
  ]);

  let query = supabase
    .from('events')
    .select('slug, name, venue, town, start_date, end_date, status, country_id, poster_url');

  if (searchParams.country) query = query.eq('country_id', searchParams.country);
  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.church) query = query.eq('host_church_id', searchParams.church);
  if (searchParams.ministry) query = query.eq('host_ministry_id', searchParams.ministry);

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

      {events && events.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {events.map((e) => (
            <EventCard
              key={e.slug}
              slug={e.slug}
              name={e.name}
              venue={e.venue}
              town={e.town}
              start_date={e.start_date}
              end_date={e.end_date}
              status={e.status}
              poster_url={e.poster_url}
            />
          ))}
        </div>
      ) : (
        <p className="text-slate-500">No events match these filters.</p>
      )}
    </div>
  );
}
