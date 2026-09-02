import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';

export default async function ChurchesPage() {
  const supabase = createClient();
  const { data: churches } = await supabase
    .from('churches')
    .select('slug, name, town, island_province, country_id, countries(name)')
    .order('name');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Church Directory</h1>
      {churches && churches.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {churches.map((c: any) => (
            <Link
              key={c.slug}
              href={`/church/${c.slug}`}
              className="block rounded border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-slate-500">
                {c.town}
                {c.island_province ? `, ${c.island_province}` : ''}
              </p>
              {c.countries?.name && <p className="text-xs text-slate-400">{c.countries.name}</p>}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-slate-500">
          No churches have been added yet.{' '}
          <Link href="/contact" className="underline">
            Add your church
          </Link>
          .
        </p>
      )}
    </div>
  );
}
