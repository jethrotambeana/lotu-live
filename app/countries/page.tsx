import type { Metadata } from 'next';
import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import PageBanner from '@/components/PageBanner';

const TITLE = 'Countries — LOTU.LIVE';
const DESCRIPTION = 'Explore LOTU.LIVE by country — Vanuatu, Solomon Islands, Papua New Guinea, Fiji and beyond.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/banner-countries.jpg', width: 2048, height: 768 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/banner-countries.jpg'],
  },
};

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
    <>
      <PageBanner src="/banner-countries.jpg" mobileSrc="/banner-countries-mobile.jpg" alt="Countries — LOTU.LIVE" />
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
    </>
  );
}
