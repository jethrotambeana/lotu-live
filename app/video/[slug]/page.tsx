import { cache } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabaseServer';
import StreamPlayer from '@/components/StreamPlayer';
import ShareButton from '@/components/ShareButton';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const getVideo = cache(async (slug: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from('videos')
    .select('*, churches(name, slug), events(name, slug), ministries(name, slug)')
    .eq('slug', slug)
    .single();
  return data;
});

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const video = await getVideo(params.slug);
  if (!video) return {};

  const description = video.description || `Watch "${video.title}" on LOTU.LIVE.`;
  // Video thumbnails are already stored as full external URLs (YouTube/
  // Cloudflare), so no metadataBase resolution needed there — it's only
  // the /og-default.jpg fallback that relies on metadataBase (set in
  // app/layout.tsx) to become absolute.
  const image = video.thumbnail || '/og-default.jpg';

  return {
    title: `${video.title} — LOTU.LIVE`,
    description,
    openGraph: {
      title: video.title,
      description,
      images: [{ url: image, width: 1280, height: 720 }],
      type: 'video.other',
    },
    twitter: {
      card: 'summary_large_image',
      title: video.title,
      description,
      images: [image],
    },
  };
}

export default async function VideoPage({ params }: { params: { slug: string } }) {
  const video = await getVideo(params.slug);
  if (!video) return notFound();

  const supabase = createClient();
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

      {(video.churches || video.events || video.ministries) && (
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          {video.churches && (
            <Link href={`/church/${video.churches.slug}`} className="text-sky-600 underline">
              {video.churches.name}
            </Link>
          )}
          {video.ministries && (
            <Link href={`/ministry/${video.ministries.slug}`} className="text-sky-600 underline">
              {video.ministries.name}
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
