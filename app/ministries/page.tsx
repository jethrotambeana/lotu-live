import type { Metadata } from 'next';
import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import FilterBar from '@/components/FilterBar';
import MinistryCard from '@/components/MinistryCard';
import PageBanner from '@/components/PageBanner';

const TITLE = 'Ministries — LOTU.LIVE';
const DESCRIPTION = 'Explore ministries serving across the Pacific — music, youth, media, outreach and more.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/banner-ministries.jpg', width: 2048, height: 768 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/banner-ministries.jpg'],
  },
};

const MINISTRY_TYPES = [
  { value: 'music_singing', label: 'Music / Singing' },
  { value: 'media_video', label: 'Media / Video' },
  { value: 'livestream_team', label: 'Livestream Team' },
  { value: 'youth', label: 'Youth' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'prayer', label: 'Prayer' },
  { value: 'childrens', label: "Children's" },
  { value: 'other', label: 'Other' },
];

export default async function MinistriesPage({
  searchParams,
}: {
  searchParams: { country?: string; type?: string };
}) {
  const supabase = createClient();

  const { data: countries } = await supabase.from('countries').select('id, name').order('name');

  let query = supabase
    .from('ministries')
    .select('slug, name, type, town, country_id, churches(name), logo_url');

  if (searchParams.country) query = query.eq('country_id', searchParams.country);
  if (searchParams.type) query = query.eq('type', searchParams.type);

  const { data: ministries } = await query.order('name');

  return (
    <>
      <PageBanner
        src="/banner-ministries.jpg"
        mobileSrc="/banner-ministries-mobile.jpg"
        alt="Ministries — LOTU.LIVE"
      />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Ministries</h1>

        <FilterBar
          filters={[
            {
              name: 'country',
              label: 'All Countries',
              options: (countries ?? []).map((c) => ({ value: c.id, label: c.name })),
            },
            {
              name: 'type',
              label: 'All Types',
              options: MINISTRY_TYPES,
            },
          ]}
        />

        {ministries && ministries.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {ministries.map((m: any) => (
              <MinistryCard
                key={m.slug}
                slug={m.slug}
                name={m.name}
                type={m.type}
                town={m.town}
                churchName={m.churches?.name}
                logoUrl={m.logo_url}
              />
            ))}
          </div>
        ) : (
          <p className="text-slate-500">
            No ministries match these filters.{' '}
            <Link href="/submit-ministry" className="underline">
              Add your ministry
            </Link>
            .
          </p>
        )}
      </div>
    </>
  );
}
