import { createClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ShareButton from '@/components/ShareButton';

export default async function SeriesPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: series } = await supabase.from('series').select('*').eq('slug', params.slug).single();
  if (!series) return notFound();

  const { data: episodes } = await supabase
    .from('videos')
    .select('slug, title, thumbnail, speaker, episode_number, recorded_date')
    .eq('series_id', series.id)
    .order('episode_number', { ascending: true, nullsFirst: false })
    .order('recorded_date', { ascending: true });

  const coverImage = series.cover_image || episodes?.[0]?.thumbnail || null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-sky-600">Series</p>
          <h1 className="text-2xl font-bold">{series.name}</h1>
          <p className="text-sm text-slate-500">
            {episodes?.length ?? 0} episode{(episodes?.length ?? 0) === 1 ? '' : 's'}
          </p>
        </div>
        <ShareButton title={series.name} />
      </div>

      {coverImage && (
        <div className="relative mt-4 aspect-video w-full overflow-hidden rounded bg-slate-100">
          <Image src={coverImage} alt={series.name} fill className="object-cover" />
        </div>
      )}

      {series.description && <p className="mt-6 text-slate-700">{series.description}</p>}

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Episodes</h2>
        <div className="space-y-2">
          {(episodes ?? []).map((ep: any, i: number) => (
            <Link
              key={ep.slug}
              href={`/video/${ep.slug}`}
              className="flex items-center gap-3 rounded border border-slate-200 p-2 hover:shadow-md transition-shadow"
            >
              <span className="w-8 shrink-0 text-center text-sm font-semibold text-slate-400">
                {ep.episode_number ?? i + 1}
              </span>
              <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded bg-slate-100">
                {ep.thumbnail && <Image src={ep.thumbnail} alt={ep.title} fill className="object-cover" />}
              </div>
              <div>
                <p className="text-sm font-medium">{ep.title}</p>
                {ep.speaker && <p className="text-xs text-slate-500">{ep.speaker}</p>}
              </div>
            </Link>
          ))}
          {(!episodes || episodes.length === 0) && (
            <p className="text-slate-500">No episodes in this series yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
