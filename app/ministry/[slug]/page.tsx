import { createClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import EventCard from '@/components/EventCard';
import VideoCard from '@/components/VideoCard';
import ShareButton from '@/components/ShareButton';
import SocialLinks from '@/components/SocialLinks';

const MINISTRY_TYPE_LABELS: Record<string, string> = {
  music_singing: 'Music / Singing',
  media_video: 'Media / Video',
  livestream_team: 'Livestream Team',
  youth: 'Youth',
  outreach: 'Outreach',
  prayer: 'Prayer',
  childrens: "Children's",
  other: 'Other',
};

export default async function MinistryPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: ministry } = await supabase
    .from('ministries')
    .select('*, countries(name), churches(name, slug)')
    .eq('slug', params.slug)
    .single();
  if (!ministry) return notFound();

  const [{ data: events }, { data: videos }] = await Promise.all([
    supabase
      .from('events')
      .select('slug, name, venue, town, start_date, end_date, status, poster_url')
      .eq('host_ministry_id', ministry.id)
      .in('status', ['upcoming', 'current'])
      .order('start_date', { ascending: true }),
    supabase
      .from('videos')
      .select('slug, title, thumbnail, speaker')
      .eq('ministry_id', ministry.id)
      .order('recorded_date', { ascending: false })
      .limit(8),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {ministry.logo_url && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100">
              <Image src={ministry.logo_url} alt={ministry.name} fill className="object-cover" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{ministry.name}</h1>
            <p className="text-slate-500">{MINISTRY_TYPE_LABELS[ministry.type] || ministry.type}</p>
            <p className="text-sm text-slate-500">
              {[ministry.town, ministry.island_province, ministry.countries?.name].filter(Boolean).join(', ')}
            </p>
            {ministry.churches && (
              <p className="mt-1 text-sm text-slate-500">
                Part of{' '}
                <Link href={`/church/${ministry.churches.slug}`} className="text-sky-600 underline">
                  {ministry.churches.name}
                </Link>
              </p>
            )}
          </div>
        </div>
        <ShareButton title={ministry.name} />
      </div>

      {(ministry.phone || ministry.email || ministry.website || ministry.facebook || ministry.youtube) && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {(ministry.phone || ministry.email) && (
            <div className="flex flex-wrap gap-4 text-sm">
              {ministry.phone && (
                <a href={`tel:${ministry.phone}`} className="text-sky-600 underline">
                  {ministry.phone}
                </a>
              )}
              {ministry.email && (
                <a href={`mailto:${ministry.email}`} className="text-sky-600 underline">
                  {ministry.email}
                </a>
              )}
            </div>
          )}
          <SocialLinks website={ministry.website} facebook={ministry.facebook} youtube={ministry.youtube} />
        </div>
      )}

      {ministry.description && <p className="mt-6 text-slate-700">{ministry.description}</p>}

      {events && events.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold">Upcoming Events</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {events.map((e) => (
              <EventCard
                key={e.slug}
                slug={e.slug}
                name={e.name}
                venue={e.venue}
                town={e.town}
                start_date={e.start_date}
                end_date={e.end_date}
                status={e.status}
                poster_url={e.poster_url}
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
