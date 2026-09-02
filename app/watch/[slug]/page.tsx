import { createClient } from '@/lib/supabaseServer';
import StreamPlayer from '@/components/StreamPlayer';
import { notFound } from 'next/navigation';

export default async function WatchPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: stream } = await supabase
    .from('livestreams')
    .select('*')
    .eq('slug', params.slug)
    .eq('visible', true)
    .single();

  if (!stream) return notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <StreamPlayer provider={stream.provider} providerStreamId={stream.provider_stream_id} />
      <div className="mt-4">
        <span className="text-xs font-semibold uppercase text-sky-600">{stream.status}</span>
        <h1 className="text-2xl font-bold">{stream.name}</h1>
        <p className="text-slate-500">{stream.location}</p>
        {stream.description && <p className="mt-3 text-slate-700">{stream.description}</p>}
      </div>
      {/* Share controls, related streams, church/event links go here */}
    </div>
  );
}
