import { createClient } from '@/lib/supabaseServer';
import ChurchCard from '@/components/ChurchCard';
import MinistryCard from '@/components/MinistryCard';
import EventCard from '@/components/EventCard';
import VideoCard from '@/components/VideoCard';
import LiveCard from '@/components/LiveCard';

// Simple ilike-based search — entirely appropriate at this platform's
// scale (dozens of churches, not millions of rows). No full-text search
// infrastructure needed; a straightforward pattern match on the relevant
// name/title columns per table covers the actual use case well. Each
// query uses the same public-scoped client as every other page, so
// Inactive churches/ministries, unapproved events/videos, and hidden
// livestreams are automatically excluded by the exact same RLS policies
// that already govern their own directory pages — nothing extra to
// enforce here.
const RESULTS_PER_TYPE = 12;

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q || '').trim();
  const supabase = createClient();

  let churches: any[] = [];
  let ministries: any[] = [];
  let events: any[] = [];
  let videos: any[] = [];
  let streams: any[] = [];

  if (q) {
    const pattern = `%${q}%`;

    const [
      { data: churchResults },
      { data: ministryResults },
      { data: eventResults },
      { data: videoResults },
      { data: streamResults },
    ] = await Promise.all([
      supabase
        .from('churches')
        .select('slug, name, town, island_province, countries(name), logo_url')
        .ilike('name', pattern)
        .limit(RESULTS_PER_TYPE),
      supabase
        .from('ministries')
        .select('slug, name, type, town, churches(name), logo_url')
        .ilike('name', pattern)
        .limit(RESULTS_PER_TYPE),
      supabase
        .from('events')
        .select('slug, name, venue, town, start_date, end_date, status, poster_url')
        .ilike('name', pattern)
        .limit(RESULTS_PER_TYPE),
      supabase
        .from('videos')
        .select('slug, title, thumbnail, speaker, provider, provider_video_id')
        .or(`title.ilike.${pattern},speaker.ilike.${pattern}`)
        .limit(RESULTS_PER_TYPE),
      supabase
        .from('livestreams')
        .select('slug, name, location, status, preview_image')
        .ilike('name', pattern)
        .limit(RESULTS_PER_TYPE),
    ]);

    churches = churchResults ?? [];
    ministries = ministryResults ?? [];
    events = eventResults ?? [];
    videos = videoResults ?? [];
    streams = streamResults ?? [];
  }

  const totalResults = churches.length + ministries.length + events.length + videos.length + streams.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Search</h1>

      <form action="/search" method="get" className="mb-8 flex max-w-xl gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search churches, ministries, events, videos, livestreams..."
          className="flex-1 rounded border border-slate-300 p-2"
          autoFocus
        />
        <button type="submit" className="rounded bg-sky-600 px-5 py-2 text-white">
          Search
        </button>
      </form>

      {!q && <p className="text-slate-500">Enter a search term above to get started.</p>}

      {q && totalResults === 0 && (
        <p className="text-slate-500">
          No results for "{q}." Try a different spelling, or browse the directories directly from
          the menu above.
        </p>
      )}

      {streams.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Livestreams</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {streams.map((s) => (
              <LiveCard
                key={s.slug}
                slug={s.slug}
                name={s.name}
                location={s.location}
                status={s.status}
                previewImage={s.preview_image}
              />
            ))}
          </div>
        </section>
      )}

      {churches.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Churches</h2>
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
        </section>
      )}

      {ministries.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Ministries</h2>
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
        </section>
      )}

      {events.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Events</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {events.map((e) => (
              <EventCard
                key={e.slug}
                slug={e.slug}
                name={e.name}
                venue={e.venue}
                town={e.town}
                start_date={e.start_date}
                end_date={e.end_date}
                status={e.status}
                poster_url={e.poster_url}
              />
            ))}
          </div>
        </section>
      )}

      {videos.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Videos</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {videos.map((v: any) => (
              <VideoCard
                key={v.slug}
                slug={v.slug}
                title={v.title}
                thumbnail={v.thumbnail}
                speaker={v.speaker}
                provider={v.provider}
                providerVideoId={v.provider_video_id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
