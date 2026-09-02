import { createClient } from '@/lib/supabaseServer';
import StreamPlayer from '@/components/StreamPlayer';
import { notFound } from 'next/navigation';

export default async function VideoPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: video } = await supabase.from('videos').select('*').eq('slug', params.slug).single();
  if (!video) return notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <StreamPlayer provider={video.provider} providerStreamId={video.provider_video_id} />
      <h1 className="mt-4 text-2xl font-bold">{video.title}</h1>
      <p className="text-slate-500">
        {video.speaker} {video.series ? `· ${video.series}` : ''}
      </p>
      {video.description && <p className="mt-3 text-slate-700">{video.description}</p>}
      {/* Share controls, related videos */}
    </div>
  );
}
