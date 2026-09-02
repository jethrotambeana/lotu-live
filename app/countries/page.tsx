import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';

const SLUG_TO_LABEL: Record<string, string> = {
  vanuatu: 'Vanuatu',
  'solomon-islands': 'Solomon Islands',
  'papua-new-guinea': 'Papua New Guinea',
  fiji: 'Fiji',
};

export default async function CountriesPage() {
  const supabase = createClient();
  const { data: countries } = await supabase.from('countries').select('id, name, code').order('name');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Countries</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(countries ?? []).map((c) => {
          const slug = c.name.toLowerCase().replace(/\s/g, '-');
          return (
            <Link
              key={c.id}
              href={`/countries/${slug}`}
              className="block rounded border border-slate-200 p-6 text-center hover:shadow-md transition-shadow"
            >
              <p className="text-lg font-medium">{c.name}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
