import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabaseServer';
import LiveCard from '@/components/LiveCard';

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
      {/* Hero — the banner already carries the wordmark, tagline, country
          list, and feature callouts. Shown at its exact natural aspect
          ratio (2046:768) so nothing is ever cropped, on any screen size.
          Constrained to the same max-w-6xl content width as every other
          section on this page, rather than full-bleed — full-bleed made it
          balloon to the entire viewport width on wide desktop screens,
          which both inflated its height far beyond what's reasonable and
          risked edge content sitting outside the visible area. Buttons sit
          in their own bar below rather than overlaid, since the banner
          gets too short on mobile to reliably host legible overlay text. */}
      <section>
        <h1 className="sr-only">LOTU.LIVE — Worship Together. Wherever You Are.</h1>
        <div className="mx-auto max-w-6xl px-4 pt-6">
          <div className="relative aspect-[2046/768] w-full overflow-hidden rounded-lg">
            <Image
              src="/hero-banner.jpg"
              alt="LOTU.LIVE — Worship Together. Wherever You Are. Live streams, inspiring messages, and church services across Vanuatu, Solomon Islands, Papua New Guinea, Fiji and beyond."
              fill
              priority
              sizes="(max-width: 1152px) 100vw, 1152px"
              className="object-cover"
            />
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3 bg-slate-900 px-4 py-5">
          <Link href="/live" className="rounded bg-sky-600 px-5 py-2 text-white hover:bg-sky-500">
            Watch Live
          </Link>
          <Link href="/churches" className="rounded border border-white/70 px-5 py-2 text-white hover:bg-white/10">
            Browse Churches
          </Link>
          <Link href="/videos" className="rounded border border-white/70 px-5 py-2 text-white hover:bg-white/10">
            Explore Videos
          </Link>
        </div>
      </section>

      {/* Live Now */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="mb-4 text-xl font-semibold">Live Now</h2>
        {liveNow && liveNow.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {liveNow.map((s) => (
              <LiveCard
                key={s.slug}
                slug={s.slug}
                name={s.name}
                location={s.location}
                status="live"
                previewImage={s.preview_image}
              />
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
              <LiveCard
                key={s.slug}
                slug={s.slug}
                name={s.name}
                location={s.location}
                status={s.status as 'upcoming' | 'scheduled'}
                previewImage={s.preview_image}
              />
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No upcoming broadcasts scheduled yet.</p>
        )}
      </section>

      {/* Submission CTA */}
      <section className="bg-slate-50 px-4 py-12 text-center">
        <h2 className="text-xl font-semibold">Get Involved</h2>
        <p className="mt-2 text-slate-600">
          Add your church, list an upcoming event, or showcase your ministry on LOTU.LIVE.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href="/submit" className="rounded bg-sky-600 px-5 py-2 text-white">
            Add Your Church
          </Link>
          <Link href="/submit-event" className="rounded border border-slate-300 px-5 py-2">
            Add Your Event
          </Link>
          <Link href="/submit-ministry" className="rounded border border-slate-300 px-5 py-2">
            Add Your Ministry
          </Link>
        </div>
      </section>
    </>
  );
}
