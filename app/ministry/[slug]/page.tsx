import { cache } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import LiveCard from '@/components/LiveCard';
import VideoCard from '@/components/VideoCard';
import EventCard from '@/components/EventCard';
import ShareButton from '@/components/ShareButton';
import SocialLinks from '@/components/SocialLinks';
import FollowButton from '@/components/FollowButton';
import { getScheduleText } from '@/lib/schedule';

const getMinistry = cache(async (slug: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from('ministries')
    .select('*, countries(name), churches(name, slug)')
    .eq('slug', slug)
    .single();
  return data;
});

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const ministry = await getMinistry(params.slug);
  if (!ministry) return {};

  const location = [ministry.town, ministry.island_province, ministry.countries?.name].filter(Boolean).join(', ');
  const description = ministry.description || [ministry.name, location].filter(Boolean).join(' — ');
  const image = ministry.logo_url || '/og-default.jpg';

  return {
    title: `${ministry.name} — LOTU.LIVE`,
    description,
    openGraph: {
      title: ministry.name,
      description,
      images: [{ url: image }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: ministry.name,
      description,
      images: [image],
    },
  };
}

export default async function MinistryPage({ params }: { params: { slug: string } }) {
  const ministry = await getMinistry(params.slug);
  if (!ministry) return notFound();

  const supabase = createClient();

  const [
    {
      data: { user },
    },
    { data: streams },
    { data: videos },
    { data: events },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('livestreams')
      .select('slug, name, location, status, preview_image, start_at, stream_schedules(day_of_week, start_time)')
      .eq('ministry_id', ministry.id)
      .eq('visible', true),
    supabase
      .from('videos')
      .select('slug, title, thumbnail, speaker, provider, provider_video_id')
      .eq('ministry_id', ministry.id)
      .order('recorded_date', { ascending: false })
      .limit(8),
    supabase
      .from('events')
      .select('slug, name, venue, town, start_date, end_date, status, poster_url')
      .eq('host_ministry_id', ministry.id)
      .in('status', ['upcoming', 'current'])
      .order('start_date', { ascending: true }),
  ]);

  let isFollowing = false;
  if (user) {
    const { data: followRow } = await supabase
      .from('follows')
      .select('id')
      .eq('user_id', user.id)
      .eq('ministry_id', ministry.id)
      .maybeSingle();
    isFollowing = !!followRow;
  }

  const liveNow = (streams ?? []).filter((s) => s.status === 'live');
  const otherStreams = (streams ?? []).filter((s) => s.status !== 'live');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {ministry.logo_url && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100">
              <Image src={ministry.logo_url} alt={ministry.name} fill className="object-cover" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{ministry.name}</h1>
            <p className="text-slate-500">
              {ministry.type}
              {ministry.churches?.name && (
                <>
                  {' · '}
                  <Link href={`/church/${ministry.churches.slug}`} className="text-sky-600 underline">
                    {ministry.churches.name}
                  </Link>
                </>
              )}
            </p>
            <p className="text-slate-500">
              {[ministry.town, ministry.island_province, ministry.countries?.name].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FollowButton
            type="ministry"
            id={ministry.id}
            following={isFollowing}
            redirectTo={`/ministry/${ministry.slug}`}
          />
          <ShareButton title={ministry.name} />
        </div>
      </div>

      {(ministry.email || ministry.phone || ministry.website || ministry.facebook || ministry.youtube) && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
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
          <SocialLinks website={ministry.website} facebook={ministry.facebook} youtube={ministry.youtube} />
        </div>
      )}

      {ministry.description && <p className="mt-6 text-slate-700">{ministry.description}</p>}

      {liveNow.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold">Current Livestream</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {liveNow.map((s) => (
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

      {otherStreams.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold">
            {liveNow.length > 0 ? 'Other Livestream Channels' : 'Livestreams'}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {otherStreams.map((s) => (
              <LiveCard
                key={s.slug}
                slug={s.slug}
                name={s.name}
                location={s.location}
                status={s.status as any}
                previewImage={s.preview_image}
                scheduleText={getScheduleText(s)}
              />
            ))}
          </div>
        </section>
      )}

      {events && events.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Upcoming Events</h2>
            <Link href={`/events?ministry=${ministry.id}`} className="text-sm text-sky-600 underline">
              View all →
            </Link>
          </div>
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
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent Videos</h2>
            <Link href={`/videos?ministry=${ministry.id}`} className="text-sm text-sky-600 underline">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {videos.map((v) => (
              <VideoCard
                key={v.slug}
                slug={v.slug}
                title={v.title}
                thumbnail={v.thumbnail}
                speaker={v.speaker}
                provider={v.provider as any}
                providerVideoId={v.provider_video_id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
