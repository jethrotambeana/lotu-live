import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const SLUG_TO_NAME: Record<string, string> = {
  vanuatu: 'Vanuatu',
  'solomon-islands': 'Solomon Islands',
  'papua-new-guinea': 'Papua New Guinea',
  fiji: 'Fiji',
};

export default async function CountryPage({ params }: { params: { code: string } }) {
  const countryName = SLUG_TO_NAME[params.code];
  if (!countryName) return notFound();

  const supabase = createClient();
  const { data: country } = await supabase.from('countries').select('id').eq('name', countryName).single();
  if (!country) return notFound();

  const { data: churches } = await supabase
    .from('churches')
    .select('slug, name, town')
    .eq('country_id', country.id);

  const { data: events } = await supabase
    .from('events')
    .select('slug, name, start_date')
    .eq('country_id', country.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{countryName}</h1>

      <section className="mb-8">
        <h2 className="mb-3 font-semibold">Churches</h2>
        {churches && churches.length > 0 ? (
          <ul className="space-y-1">
            {churches.map((c) => (
              <li key={c.slug}>
                <Link href={`/church/${c.slug}`} className="underline">
                  {c.name}
                </Link>{' '}
                <span className="text-sm text-slate-500">— {c.town}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">No churches listed for {countryName} yet.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Events</h2>
        {events && events.length > 0 ? (
          <ul className="space-y-1">
            {events.map((e) => (
              <li key={e.slug}>
                <Link href={`/event/${e.slug}`} className="underline">
                  {e.name}
                </Link>{' '}
                <span className="text-sm text-slate-500">— {e.start_date}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500">No events listed for {countryName} yet.</p>
        )}
      </section>
    </div>
  );
}
