import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseServer';
import FilterBar from '@/components/FilterBar';
import SeriesCard from '@/components/SeriesCard';
import VideoCard from '@/components/VideoCard';
import PageBanner from '@/components/PageBanner';

const TITLE = 'Latest Videos — LOTU.LIVE';
const DESCRIPTION =
  'Sermons, testimonies, Bible study and inspiring media from churches and ministries across the Pacific.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/banner-videos-og.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/banner-videos-og.jpg'],
  },
};

const PAGE_SIZE = 24;

export default async function VideosPage({
  searchParams,
}: {
  searchParams: { category?: string; language?: string; church?: string; ministry?: string; page?: string };
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

  // Page is 1-indexed for the URL (?page=1, ?page=2, ...) but Supabase's
  // .range() is a zero-indexed [from, to] pair — parseInt falling back to
  // 1 covers both "no page param" and a malformed one (e.g. ?page=abc).
  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Only join video_categories (with !inner) when actually filtering by
  // category — an unconditional inner join would silently exclude any
  // video that has no categories assigned yet.
  const selectColumns = searchParams.category
    ? 'slug, title, thumbnail, speaker, provider, provider_video_id, series_id, series(name, slug, cover_image), video_categories!inner(category_id)'
    : 'slug, title, thumbnail, speaker, provider, provider_video_id, series_id, series(name, slug, cover_image)';

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

  const { data: videosRaw } = await query.order('recorded_date', { ascending: false }).range(from, to);
  const videos = (videosRaw ?? []) as any[];

  // A full page of raw rows means there's likely a next page; anything
  // short of that means this is the last one. Deliberately not running a
  // separate exact COUNT query to compute total pages — series grouping
  // below means "24 raw rows" doesn't map to a fixed number of displayed
  // cards anyway, so an exact page count would be more complex to compute
  // than it's worth. A plain Previous/Next pager fits the actual data
  // shape better than numbered pages would.
  const hasNextPage = videos.length === PAGE_SIZE;
  const hasPrevPage = page > 1;

  function buildPageUrl(targetPage: number): string {
    const params = new URLSearchParams();
    if (searchParams.category) params.set('category', searchParams.category);
    if (searchParams.language) params.set('language', searchParams.language);
    if (searchParams.church) params.set('church', searchParams.church);
    if (searchParams.ministry) params.set('ministry', searchParams.ministry);
    if (targetPage > 1) params.set('page', String(targetPage));
    const qs = params.toString();
    return qs ? `/videos?${qs}` : '/videos';
  }

  // Group consecutive/repeated series into a single card, in first-seen
  // order (i.e. the order of that series' most recent episode) — a video
  // with no series_id displays individually exactly as before.
  type DisplayItem =
    | {
        kind: 'video';
        slug: string;
        title: string;
        thumbnail: string | null;
        speaker: string | null;
        provider: string | null;
        providerVideoId: string | null;
      }
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
      items.push({
        kind: 'video',
        slug: v.slug,
        title: v.title,
        thumbnail: v.thumbnail,
        speaker: v.speaker,
        provider: v.provider,
        providerVideoId: v.provider_video_id,
      });
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
      <PageBanner src="/banner-videos.jpg" mobileSrc="/banner-videos-mobile.jpg" alt="Videos — LOTU.LIVE" />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Latest Videos</h1>

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
                <VideoCard
                  key={item.slug}
                  slug={item.slug}
                  title={item.title}
                  thumbnail={item.thumbnail}
                  speaker={item.speaker}
                  provider={item.provider as any}
                  providerVideoId={item.providerVideoId}
                />
              )
            )}
          </div>
        ) : (
          <p className="text-slate-500">No videos match these filters.</p>
        )}

        {(hasPrevPage || hasNextPage) && (
          <div className="mt-8 flex items-center justify-between">
            {hasPrevPage ? (
              <Link href={buildPageUrl(page - 1)} className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-slate-400">Page {page}</span>
            {hasNextPage ? (
              <Link href={buildPageUrl(page + 1)} className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
                Next →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </div>
    </>
  );
}
