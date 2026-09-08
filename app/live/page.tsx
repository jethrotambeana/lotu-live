import type { Metadata } from 'next';
import { createClient } from '@/lib/supabaseServer';
import LiveCard from '@/components/LiveCard';
import FilterBar from '@/components/FilterBar';
import PageBanner from '@/components/PageBanner';

const TITLE = 'Watch Live — LOTU.LIVE';
const DESCRIPTION =
  'Watch live worship services, evangelistic meetings, and youth programs streaming now across Vanuatu, Solomon Islands, Papua New Guinea, Fiji and beyond.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/banner-live-og.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/banner-live-og.jpg'],
  },
};

// Best-practice ordering for a mixed directory of broadcasts: what's
// actionable right now comes first (live), then what's coming up soonest
// (so a viewer knows what to check back for), and finally what's currently
// dormant (offline) at the bottom, since it's the least useful thing to
// lead with.
const STATUS_RANK: Record<string, number> = { live: 0, upcoming: 1, scheduled: 1, offline: 2 };

function sortStreams<T extends { status: string; name: string; start_at?: string | null }>(streams: T[]): T[] {
  return streams.slice().sort((a, b) => {
    const rankDiff = (STATUS_RANK[a.status] ?? 3) - (STATUS_RANK[b.status] ?? 3);
    if (rankDiff !== 0) return rankDiff;
    // Within upcoming/scheduled: soonest first. Within live/offline (no
    // meaningful time to sort by): alphabetical.
    if ((a.status === 'upcoming' || a.status === 'scheduled') && a.start_at && b.start_at) {
      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    }
    return a.name.localeCompare(b.name);
  });
}

export default async function LiveDirectoryPage({
  searchParams,
}: {
  searchParams: { country?: string; type?: string; status?: string; language?: string };
}) {
  const supabase = createClient();

  const [{ data: countries }, { data: languageRows }] = await Promise.all([
    supabase.from('countries').select('id, name').order('name'),
    supabase.from('livestreams').select('language').not('language', 'is', null),
  ]);

  const languages = Array.from(
    new Set((languageRows ?? []).map((r: any) => r.language).filter(Boolean))
  ).sort();

  let query = supabase
    .from('livestreams')
    .select('slug, name, location, status, preview_image, country_id, type, start_at')
    .eq('visible', true);

  if (searchParams.country) query = query.eq('country_id', searchParams.country);
  if (searchParams.type) query = query.eq('type', searchParams.type);
  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.language) query = query.eq('language', searchParams.language);

  const { data: streamsRaw } = await query.limit(50);
  const streams = sortStreams(streamsRaw ?? []);

  const filters = (
    <FilterBar
      filters={[
        {
          name: 'country',
          label: 'All Countries',
          options: (countries ?? []).map((c) => ({ value: c.id, label: c.name })),
        },
        {
          name: 'type',
          label: 'Any Type',
          options: [
            { value: 'church', label: 'Church' },
            { value: 'ministry', label: 'Ministry' },
            { value: 'event', label: 'Event' },
            { value: 'organisation', label: 'Organisation' },
          ],
        },
        {
          name: 'status',
          label: 'Any Status',
          options: [
            { value: 'live', label: 'Live' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'offline', label: 'Offline' },
          ],
        },
        {
          name: 'language',
          label: 'All Languages',
          options: languages.map((l) => ({ value: l, label: l })),
        },
      ]}
    />
  );

  function grid(items: typeof streams) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {items.map((s) => (
          <LiveCard
            key={s.slug}
            slug={s.slug}
            name={s.name}
            location={s.location}
            status={s.status as any}
            previewImage={s.preview_image}
          />
        ))}
      </div>
    );
  }

  // A specific status filter is already a single, homogeneous list — extra
  // section headers there would be redundant. Only group into sections
  // when browsing the full mixed "Any Status" view, matching the same
  // Live Now / Coming Up pattern already used on the homepage.
  if (searchParams.status) {
    return (
      <>
        <PageBanner src="/banner-live.jpg" mobileSrc="/banner-live-mobile.jpg" alt="Watch Live — LOTU.LIVE" />
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="mb-6 text-2xl font-bold">Watch Live</h1>
          {filters}
          {streams.length > 0 ? grid(streams) : <p className="text-slate-500">No broadcasts match these filters.</p>}
        </div>
      </>
    );
  }

  const live = streams.filter((s) => s.status === 'live');
  const comingUp = streams.filter((s) => s.status === 'upcoming' || s.status === 'scheduled');
  const offline = streams.filter((s) => s.status === 'offline');

  return (
    <>
      <PageBanner src="/banner-live.jpg" mobileSrc="/banner-live-mobile.jpg" alt="Watch Live — LOTU.LIVE" />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Watch Live</h1>
        {filters}

        {streams.length === 0 && <p className="text-slate-500">No broadcasts match these filters.</p>}

        {live.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-lg font-semibold">Live Now</h2>
            {grid(live)}
          </section>
        )}

        {comingUp.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-lg font-semibold">Coming Up</h2>
            {grid(comingUp)}
          </section>
        )}

        {offline.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-500">Offline</h2>
            {grid(offline)}
          </section>
        )}
      </div>
    </>
  );
}
