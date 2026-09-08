import { cache } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabaseServer';
import StreamPlayer from '@/components/StreamPlayer';
import ShareButton from '@/components/ShareButton';
import { notFound } from 'next/navigation';
import Link from 'next/link';

function formatDateTime(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

const getStream = cache(async (slug: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from('livestreams')
    .select('*, countries(name), categories(name), churches(name, slug), events(name, slug)')
    .eq('slug', slug)
    .eq('visible', true)
    .single();
  return data;
});

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const stream = await getStream(params.slug);
  if (!stream) return {};

  const description =
    stream.status === 'live'
      ? `Watch "${stream.name}" live now on LOTU.LIVE.`
      : `"${stream.name}" on LOTU.LIVE.`;
  const image = stream.preview_image || '/og-default.jpg';

  return {
    title: `${stream.status === 'live' ? '🔴 LIVE — ' : ''}${stream.name} — LOTU.LIVE`,
    description,
    openGraph: {
      title: stream.name,
      description,
      images: [{ url: image, width: 1280, height: 720 }],
      type: 'video.other',
    },
    twitter: {
      card: 'summary_large_image',
      title: stream.name,
      description,
      images: [image],
    },
  };
}

export default async function WatchPage({ params }: { params: { slug: string } }) {
  const stream = await getStream(params.slug);
  if (!stream) return notFound();

  const locationParts = [stream.location, stream.island_province, stream.countries?.name].filter(Boolean);
  const start = formatDateTime(stream.start_at);
  const end = formatDateTime(stream.end_at);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <StreamPlayer provider={stream.provider} providerStreamId={stream.provider_stream_id} />

      <div className="mt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase text-sky-600">{stream.status}</span>
            <h1 className="text-2xl font-bold">{stream.name}</h1>
            {locationParts.length > 0 && <p className="text-slate-500">{locationParts.join(', ')}</p>}
          </div>
          <ShareButton title={stream.name} />
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
          {stream.language && <span>Language: {stream.language}</span>}
          {stream.categories?.name && <span>{stream.categories.name}</span>}
          {(start || end) && (
            <span>
              {start}
              {start && end ? ' – ' : ''}
              {end}
            </span>
          )}
        </div>

        {(stream.churches || stream.events) && (
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {stream.churches && (
              <Link href={`/church/${stream.churches.slug}`} className="text-sky-600 underline">
                {stream.churches.name}
              </Link>
            )}
            {stream.events && (
              <Link href={`/event/${stream.events.slug}`} className="text-sky-600 underline">
                {stream.events.name}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
