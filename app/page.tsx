import Link from 'next/link';
import { createClient } from '@/lib/supabaseServer';
import LiveCard from '@/components/LiveCard';

const COUNTRIES = ['Vanuatu', 'Solomon Islands', 'Papua New Guinea', 'Fiji'];

export default async function HomePage() {
  const supabase = createClient();

  const { data: liveNow } = await supabase
    .from('livestreams')
    .select('slug, name, location, status, preview_image')
    .eq('visible', true)
    .eq('status', 'live')
    .limit(6);

  const { data: comingUp } = await supabase
    .from('livestreams')
    .select('slug, name, location, status, preview_image, start_at')
    .eq('visible', true)
    .in('status', ['upcoming', 'scheduled'])
    .order('start_at', { ascending: true })
    .limit(6);

  return (
    <>
      {/* Hero */}
      <section className="bg-slate-50 px-4 py-16 text-center">
        <h1 className="mx-auto max-w-2xl text-3xl font-bold md:text-4xl">
          Worship Together. Wherever You Are.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-600">
          Watch Seventh-day Adventist worship services, evangelistic meetings, youth programs
          and special events from across Vanuatu, Solomon Islands, Papua New Guinea and Fiji.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/live" className="rounded bg-sky-600 px-5 py-2 text-white">
            Watch Live
          </Link>
          <Link href="/churches" className="rounded border border-slate-300 px-5 py-2">
            Browse Churches
          </Link>
          <Link href="/videos" className="rounded border border-slate-300 px-5 py-2">
            Explore Videos
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
          {COUNTRIES.map((c) => (
            <Link key={c} href={`/countries/${c.toLowerCase().replace(/\s/g, '-')}`} className="underline">
              {c}
            </Link>
          ))}
        </div>
      </section>

      {/* Live Now */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="mb-4 text-xl font-semibold">Live Now</h2>
        {liveNow && liveNow.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {liveNow.map((s) => (
              <LiveCard key={s.slug} {...s} status="live" />
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No broadcasts are live right now — check Coming Up below.</p>
        )}
      </section>

      {/* Coming Up */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="mb-4 text-xl font-semibold">Coming Up</h2>
        {comingUp && comingUp.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {comingUp.map((s) => (
              <LiveCard key={s.slug} {...s} status={s.status as 'upcoming' | 'scheduled'} />
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No upcoming broadcasts scheduled yet.</p>
        )}
      </section>

      {/* Submission CTA */}
      <section className="bg-slate-50 px-4 py-12 text-center">
        <h2 className="text-xl font-semibold">Is your church broadcasting?</h2>
        <p className="mt-2 text-slate-600">Add your church or submit your stream to LOTU.LIVE.</p>
        <Link href="/submit" className="mt-4 inline-block rounded bg-sky-600 px-5 py-2 text-white">
          Add Your Church
        </Link>
      </section>
    </>
  );
}
