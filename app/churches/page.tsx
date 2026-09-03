import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import FilterBar from '@/components/FilterBar';
import ChurchCard from '@/components/ChurchCard';

export default async function ChurchesPage({
  searchParams,
}: {
  searchParams: { country?: string; island_province?: string };
}) {
  const supabase = createClient();

  const [{ data: countries }, { data: provinceRows }] = await Promise.all([
    supabase.from('countries').select('id, name').order('name'),
    supabase.from('churches').select('island_province').not('island_province', 'is', null),
  ]);

  // Distinct island/province values — no dedicated lookup table for these,
  // so derive the option list from what's actually in use.
  const provinces = Array.from(
    new Set((provinceRows ?? []).map((r: any) => r.island_province).filter(Boolean))
  ).sort();

  let query = supabase
    .from('churches')
    .select('slug, name, town, island_province, country_id, countries(name), logo_url');

  if (searchParams.country) query = query.eq('country_id', searchParams.country);
  if (searchParams.island_province) query = query.eq('island_province', searchParams.island_province);

  const { data: churches } = await query.order('name');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Church Directory</h1>

      <FilterBar
        filters={[
          {
            name: 'country',
            label: 'All Countries',
            options: (countries ?? []).map((c) => ({ value: c.id, label: c.name })),
          },
          {
            name: 'island_province',
            label: 'All Islands/Provinces',
            options: provinces.map((p) => ({ value: p, label: p })),
          },
        ]}
      />

      {churches && churches.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {churches.map((c: any) => (
            <ChurchCard
              key={c.slug}
              slug={c.slug}
              name={c.name}
              town={c.town}
              island_province={c.island_province}
              countryName={c.countries?.name}
              logo_url={c.logo_url}
            />
          ))}
        </div>
      ) : (
        <p className="text-slate-500">
          No churches match these filters.{' '}
          <Link href="/contact" className="underline">
            Add your church
          </Link>
          .
        </p>
      )}
    </div>
  );
}
