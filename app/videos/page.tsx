import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import Image from 'next/image';
import FilterBar from '@/components/FilterBar';

export default async function VideosPage({
  searchParams,
}: {
  searchParams: { category?: string; language?: string };
}) {
  const supabase = createClient();

  const [{ data: categories }, { data: languageRows }] = await Promise.all([
    supabase.from('categories').select('id, name').order('name'),
    supabase.from('videos').select('language').not('language', 'is', null),
  ]);

  const languages = Array.from(
    new Set((languageRows ?? []).map((r: any) => r.language).filter(Boolean))
  ).sort();

  // Only join video_categories (with !inner) when actually filtering by
  // category — an unconditional inner join would silently exclude any
  // video that has no categories assigned yet.
  const selectColumns = searchParams.category
    ? 'slug, title, thumbnail, speaker, video_categories!inner(category_id)'
    : 'slug, title, thumbnail, speaker';

  let query = supabase.from('videos').select(selectColumns);

  if (searchParams.category) {
    query = query.eq('video_categories.category_id', searchParams.category);
  }
  if (searchParams.language) {
    query = query.eq('language', searchParams.language);
  }

  const { data: videos } = await query.order('recorded_date', { ascending: false }).limit(24);

  return (
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
        ]}
      />

      {videos && videos.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {(videos as any[]).map((v) => (
            <Link key={v.slug} href={`/video/${v.slug}`} className="block">
              <div className="relative aspect-video overflow-hidden rounded bg-slate-100">
                {v.thumbnail && <Image src={v.thumbnail} alt={v.title} fill className="object-cover" />}
              </div>
              <p className="mt-2 text-sm font-medium">{v.title}</p>
              {v.speaker && <p className="text-xs text-slate-500">{v.speaker}</p>}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-slate-500">No videos match these filters.</p>
      )}
    </div>
  );
}
