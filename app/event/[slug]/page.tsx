import { createClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import LiveCard from '@/components/LiveCard';
import VideoCard from '@/components/VideoCard';
import ShareButton from '@/components/ShareButton';
import SocialLinks from '@/components/SocialLinks';

export default async function EventPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: event } = await supabase
    .from('events')
    .select('*, countries(name), churches(name, slug)')
    .eq('slug', params.slug)
    .single();
  if (!event) return notFound();

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

      <div className="flex items-start justify-between gap-4">
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
          ) : (
            event.hosted_by && <p className="text-sm text-slate-500">Hosted by {event.hosted_by}</p>
          )}
        </div>
        <ShareButton title={event.name} />
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
