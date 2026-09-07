import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import Image from 'next/image';
import FilterBar from '@/components/FilterBar';
import SeriesCard from '@/components/SeriesCard';
import PageBanner from '@/components/PageBanner';

export default async function VideosPage({
  searchParams,
}: {
  searchParams: { category?: string; language?: string; church?: string; ministry?: string };
}) {
  const supabase = createClient();

  const [{ data: categories }, { data: languageRows }, { data: churches }, { data: ministries }] =
    await Promise.all([
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('videos').select('language').not('language', 'is', null),
      supabase.from('churches').select('id, name').order('name'),
      supabase.from('ministries').select('id, name').order('name'),
    ]);

  const languages = Array.from(
    new Set((languageRows ?? []).map((r: any) => r.language).filter(Boolean))
  ).sort();

  // Only join video_categories (with !inner) when actually filtering by
  // category — an unconditional inner join would silently exclude any
  // video that has no categories assigned yet.
  const selectColumns = searchParams.category
    ? 'slug, title, thumbnail, speaker, series_id, series(name, slug, cover_image), video_categories!inner(category_id)'
    : 'slug, title, thumbnail, speaker, series_id, series(name, slug, cover_image)';

  let query = supabase.from('videos').select(selectColumns);

  if (searchParams.category) {
    query = query.eq('video_categories.category_id', searchParams.category);
  }
  if (searchParams.language) {
    query = query.eq('language', searchParams.language);
  }
  if (searchParams.church) {
    query = query.eq('church_id', searchParams.church);
  }
  if (searchParams.ministry) {
    query = query.eq('ministry_id', searchParams.ministry);
  }

  const { data: videosRaw } = await query.order('recorded_date', { ascending: false }).limit(24);
  const videos = (videosRaw ?? []) as any[];

  // Group consecutive/repeated series into a single card, in first-seen
  // order (i.e. the order of that series' most recent episode) — a video
  // with no series_id displays individually exactly as before.
  type DisplayItem =
    | { kind: 'video'; slug: string; title: string; thumbnail: string | null; speaker: string | null }
    | { kind: 'series'; seriesId: string; slug: string; name: string; coverImage: string | null; episodeCount: number };

  const items: DisplayItem[] = [];
  const seenSeriesIds = new Set<string>();

  for (const v of videos) {
    if (v.series_id && v.series) {
      if (seenSeriesIds.has(v.series_id)) continue;
      seenSeriesIds.add(v.series_id);
      items.push({
        kind: 'series',
        seriesId: v.series_id,
        slug: v.series.slug,
        name: v.series.name,
        coverImage: v.series.cover_image || v.thumbnail || null,
        episodeCount: 1, // placeholder, overwritten below with the true total
      });
    } else {
      items.push({ kind: 'video', slug: v.slug, title: v.title, thumbnail: v.thumbnail, speaker: v.speaker });
    }
  }

  // Episode counts reflect the series' full episode count, not just how
  // many of its episodes happen to fall within this page's 24-item slice.
  if (seenSeriesIds.size > 0) {
    const { data: counts } = await supabase
      .from('series')
      .select('id, videos(count)')
      .in('id', Array.from(seenSeriesIds));
    const countMap = new Map((counts ?? []).map((s: any) => [s.id, s.videos?.[0]?.count ?? 0]));
    for (const item of items) {
      if (item.kind === 'series') {
        item.episodeCount = countMap.get(item.seriesId) ?? item.episodeCount;
      }
    }
  }

  return (
    <>
      <PageBanner src="/banner-videos.jpg" alt="Videos — LOTU.LIVE" />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="sr-only">Latest Videos</h1>

        <FilterBar
          filters={[
            {
              name: 'category',
              label: 'All Categories',
              options: (categories ?? []).map((c) => ({ value: c.id, label: c.name })),
            },
            {
              name: 'language',
              label: 'All Languages',
              options: languages.map((l) => ({ value: l, label: l })),
            },
            {
              name: 'church',
              label: 'All Churches',
              options: (churches ?? []).map((c) => ({ value: c.id, label: c.name })),
            },
            {
              name: 'ministry',
              label: 'All Ministries',
              options: (ministries ?? []).map((m) => ({ value: m.id, label: m.name })),
            },
          ]}
        />

        {items.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) =>
              item.kind === 'series' ? (
                <SeriesCard
                  key={`series-${item.slug}`}
                  slug={item.slug}
                  name={item.name}
                  coverImage={item.coverImage}
                  episodeCount={item.episodeCount}
                />
              ) : (
                <Link key={item.slug} href={`/video/${item.slug}`} className="block">
                  <div className="relative aspect-video overflow-hidden rounded bg-slate-100">
                    {item.thumbnail && (
                      <Image src={item.thumbnail} alt={item.title} fill className="object-cover" />
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium">{item.title}</p>
                  {item.speaker && <p className="text-xs text-slate-500">{item.speaker}</p>}
                </Link>
              )
            )}
          </div>
        ) : (
          <p className="text-slate-500">No videos match these filters.</p>
        )}
      </div>
    </>
  );
}
