import { cache } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import LiveCard from '@/components/LiveCard';
import VideoCard from '@/components/VideoCard';
import ShareButton from '@/components/ShareButton';
import SocialLinks from '@/components/SocialLinks';
import QRCodeImage from '@/components/QRCode';

const getEvent = cache(async (slug: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from('events')
    .select('*, countries(name), churches(name, slug), ministries(name, slug)')
    .eq('slug', slug)
    .single();
  return data;
});

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const event = await getEvent(params.slug);
  if (!event) return {};

  const location = [event.venue, event.town, event.countries?.name].filter(Boolean).join(', ');
  const description = event.description || [event.start_date, location].filter(Boolean).join(' · ') || `${event.name} on LOTU.LIVE.`;
  const image = event.poster_url || '/og-default.jpg';

  return {
    title: `${event.name} — LOTU.LIVE`,
    description,
    openGraph: {
      title: event.name,
      description,
      images: [{ url: image, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.name,
      description,
      images: [image],
    },
  };
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await getEvent(params.slug);
  if (!event) return notFound();

  const supabase = createClient();
  const [{ data: liveStreams }, { data: videos }] = await Promise.all([
    supabase
      .from('livestreams')
      .select('slug, name, location, status, preview_image')
      .eq('event_id', event.id)
      .eq('visible', true),
    supabase
      .from('videos')
      .select('slug, title, thumbnail, speaker')
      .eq('event_id', event.id)
      .order('recorded_date', { ascending: false })
      .limit(8),
  ]);

  const dateRange = [event.start_date, event.end_date].filter(Boolean).join(' – ');
  const timeRange = [event.start_time, event.end_time].filter(Boolean).join(' – ');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {event.poster_url && (
        <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-lg bg-slate-100">
          <Image src={event.poster_url} alt={event.name} fill className="object-cover" />
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase text-sky-600">{event.status}</span>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-slate-500">
            {[event.venue, event.town, event.island_province, event.countries?.name]
              .filter(Boolean)
              .join(', ')}
          </p>
          {event.churches ? (
            <p className="text-sm text-slate-500">
              Hosted by{' '}
              <Link href={`/church/${event.churches.slug}`} className="text-sky-600 underline">
                {event.churches.name}
              </Link>
            </p>
          ) : event.ministries ? (
            <p className="text-sm text-slate-500">
              Hosted by{' '}
              <Link href={`/ministry/${event.ministries.slug}`} className="text-sky-600 underline">
                {event.ministries.name}
              </Link>
            </p>
          ) : (
            event.hosted_by && <p className="text-sm text-slate-500">Hosted by {event.hosted_by}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton title={event.name} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
        {dateRange && <span>{dateRange}</span>}
        {timeRange && <span>{timeRange}</span>}
        {event.languages && event.languages.length > 0 && <span>Languages: {event.languages.join(', ')}</span>}
      </div>

      <div className="mt-3">
        <SocialLinks website={event.website} facebook={event.facebook} youtube={event.youtube} />
      </div>

      {event.description && <p className="mt-4 text-slate-700">{event.description}</p>}

      <div className="mt-6 flex items-center gap-3 rounded border border-slate-200 bg-slate-50 p-4">
        <QRCodeImage
          value={`https://lotu.live/event/${event.slug}`}
          size={120}
          downloadName={`${event.slug}-qr.png`}
        />
        <p className="text-sm text-slate-600">
          Scan to open this event page on a phone — handy for flyers, bulletins, or a projector slide.
        </p>
      </div>

      {liveStreams && liveStreams.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold">Livestreams</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {liveStreams.map((s) => (
              <LiveCard
                key={s.slug}
                slug={s.slug}
                name={s.name}
                location={s.location}
                status={s.status as any}
                previewImage={s.preview_image}
              />
            ))}
          </div>
        </section>
      )}

      {videos && videos.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold">Videos</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {videos.map((v) => (
              <VideoCard key={v.slug} slug={v.slug} title={v.title} thumbnail={v.thumbnail} speaker={v.speaker} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
