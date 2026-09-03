import { createClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import LiveCard from '@/components/LiveCard';
import VideoCard from '@/components/VideoCard';
import ShareButton from '@/components/ShareButton';

export default async function ChurchPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: church } = await supabase
    .from('churches')
    .select('*, countries(name)')
    .eq('slug', params.slug)
    .single();
  if (!church) return notFound();

  const [{ data: liveNow }, { data: videos }] = await Promise.all([
    supabase
      .from('livestreams')
      .select('slug, name, location, status, preview_image')
      .eq('church_id', church.id)
      .eq('visible', true)
      .eq('status', 'live'),
    supabase
      .from('videos')
      .select('slug, title, thumbnail, speaker')
      .eq('church_id', church.id)
      .order('recorded_date', { ascending: false })
      .limit(8),
  ]);

  const contactLinks = [
    church.phone && { label: church.phone, href: `tel:${church.phone}` },
    church.email && { label: church.email, href: `mailto:${church.email}` },
    church.website && { label: 'Website', href: church.website },
    church.facebook && { label: 'Facebook', href: church.facebook },
    church.youtube && { label: 'YouTube', href: church.youtube },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{church.name}</h1>
          <p className="text-slate-500">
            {[church.town, church.island_province, church.countries?.name].filter(Boolean).join(', ')}
          </p>
          {church.address && <p className="mt-1 text-sm text-slate-500">{church.address}</p>}
        </div>
        <ShareButton title={church.name} />
      </div>

      {contactLinks.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {contactLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="text-sky-600 underline"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}

      {church.description && <p className="mt-6 text-slate-700">{church.description}</p>}
      {church.worship_times && (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-medium">Worship times:</span> {church.worship_times}
        </p>
      )}

      {liveNow && liveNow.length > 0 && (
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

      {videos && videos.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold">Recent Videos</h2>
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
