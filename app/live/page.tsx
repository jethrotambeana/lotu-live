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
    .select('slug, name, location, status, preview_image, country_id, type')
    .eq('visible', true);

  if (searchParams.country) query = query.eq('country_id', searchParams.country);
  if (searchParams.type) query = query.eq('type', searchParams.type);
  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.language) query = query.eq('language', searchParams.language);

  const { data: streams } = await query.limit(50);

  return (
    <>
      <PageBanner src="/banner-live.jpg" mobileSrc="/banner-live-mobile.jpg" alt="Watch Live — LOTU.LIVE" />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Watch Live</h1>

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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {(streams ?? []).map((s) => (
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
        {(!streams || streams.length === 0) && (
          <p className="text-slate-500">No broadcasts match these filters.</p>
        )}
      </div>
    </>
  );
}
