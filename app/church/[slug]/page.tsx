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
import QRCodeImage from '@/components/QRCode';
import { getScheduleText } from '@/lib/schedule';

const getChurch = cache(async (slug: string) => {
  const supabase = createClient();
  const { data, error } = await supabase.from('churches').select('*, countries(name)').eq('slug', slug).single();
  if (error) {
    console.error(`getChurch: query failed for slug "${slug}":`, error);
  }
  return data;
});

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const church = await getChurch(params.slug);
  if (!church) return {};

  const location = [church.town, church.island_province, church.countries?.name].filter(Boolean).join(', ');
  const description = church.description || [`${church.name}`, location].filter(Boolean).join(' — ');
  const image = church.logo_url || '/og-default.jpg';

  return {
    title: `${church.name} — LOTU.LIVE`,
    description,
    openGraph: {
      title: church.name,
      description,
      images: [{ url: image }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: church.name,
      description,
      images: [image],
    },
  };
}

export default async function ChurchPage({ params }: { params: { slug: string } }) {
  const church = await getChurch(params.slug);
  if (!church) return notFound();

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
      .eq('church_id', church.id)
      .eq('visible', true),
    supabase
      .from('videos')
      .select('slug, title, thumbnail, speaker, provider, provider_video_id')
      .eq('church_id', church.id)
      .order('recorded_date', { ascending: false })
      .limit(8),
    supabase
      .from('events')
      .select('slug, name, venue, town, start_date, end_date, status, poster_url')
      .eq('host_church_id', church.id)
      .in('status', ['upcoming', 'current'])
      .order('start_date', { ascending: true }),
  ]);

  let isFollowing = false;
  if (user) {
    const { data: followRow } = await supabase
      .from('follows')
      .select('id')
      .eq('user_id', user.id)
      .eq('church_id', church.id)
      .maybeSingle();
    isFollowing = !!followRow;
  }

  const liveNow = (streams ?? []).filter((s) => s.status === 'live');
  const otherStreams = (streams ?? []).filter((s) => s.status !== 'live');

  const directContact = [
    church.phone && { label: church.phone, href: `tel:${church.phone}` },
    church.email && { label: church.email, href: `mailto:${church.email}` },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {church.logo_url && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100">
              <Image src={church.logo_url} alt={church.name} fill className="object-cover" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{church.name}</h1>
            <p className="text-slate-500">
              {[church.town, church.island_province, church.countries?.name].filter(Boolean).join(', ')}
            </p>
            {church.address && <p className="mt-1 text-sm text-slate-500">{church.address}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FollowButton type="church" id={church.id} following={isFollowing} redirectTo={`/church/${church.slug}`} />
          {church.latitude != null && church.longitude != null && (
            <a
              href={`/map?church=${church.slug}`}
              className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              View on Map
            </a>
          )}
          <ShareButton title={church.name} />
        </div>
      </div>

      {(directContact.length > 0 || church.website || church.facebook || church.youtube) && (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {directContact.length > 0 && (
            <div className="flex flex-wrap gap-4 text-sm">
              {directContact.map((link) => (
                <a key={link.href} href={link.href} className="text-sky-600 underline">
                  {link.label}
                </a>
              ))}
            </div>
          )}
          <SocialLinks website={church.website} facebook={church.facebook} youtube={church.youtube} />
        </div>
      )}

      {church.description && <p className="mt-6 text-slate-700">{church.description}</p>}
      {church.worship_times && (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-medium">Worship times:</span> {church.worship_times}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3 rounded border border-slate-200 bg-slate-50 p-4">
        <QRCodeImage
          value={`https://lotu.live/church/${church.slug}`}
          size={120}
          downloadName={`${church.slug}-qr.png`}
        />
        <p className="text-sm text-slate-600">
          Scan to open this page on a phone — handy for bulletins, posters, or a projector slide.
        </p>
      </div>

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
            <Link href={`/events?church=${church.id}`} className="text-sm text-sky-600 underline">
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
            <Link href={`/videos?church=${church.id}`} className="text-sm text-sky-600 underline">
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
