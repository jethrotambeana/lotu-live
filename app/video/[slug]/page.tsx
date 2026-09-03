import { createClient } from '@/lib/supabaseServer';
import StreamPlayer from '@/components/StreamPlayer';
import ShareButton from '@/components/ShareButton';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function VideoPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: video } = await supabase
    .from('videos')
    .select('*, churches(name, slug), events(name, slug)')
    .eq('slug', params.slug)
    .single();
  if (!video) return notFound();

  const { data: categoryLinks } = await supabase
    .from('video_categories')
    .select('categories(name)')
    .eq('video_id', video.id);

  const categories = (categoryLinks ?? []).map((c: any) => c.categories?.name).filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <StreamPlayer provider={video.provider} providerStreamId={video.provider_video_id} />

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{video.title}</h1>
          <p className="text-slate-500">
            {video.speaker} {video.series ? `· ${video.series}` : ''}
          </p>
        </div>
        <ShareButton title={video.title} />
      </div>

      <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
        {video.language && <span>Language: {video.language}</span>}
        {video.recorded_date && <span>Recorded: {video.recorded_date}</span>}
        {categories.length > 0 && <span>{categories.join(', ')}</span>}
      </div>

      {(video.churches || video.events) && (
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          {video.churches && (
            <Link href={`/church/${video.churches.slug}`} className="text-sky-600 underline">
              {video.churches.name}
            </Link>
          )}
          {video.events && (
            <Link href={`/event/${video.events.slug}`} className="text-sky-600 underline">
              {video.events.name}
            </Link>
          )}
        </div>
      )}

      {video.description && <p className="mt-3 text-slate-700">{video.description}</p>}
    </div>
  );
}
