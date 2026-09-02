import { createClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';

export default async function ChurchPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: church } = await supabase.from('churches').select('*').eq('slug', params.slug).single();
  if (!church) return notFound();

  const { data: liveNow } = await supabase
    .from('livestreams')
    .select('slug, name, status')
    .eq('church_id', church.id)
    .eq('visible', true);

  const { data: videos } = await supabase
    .from('videos')
    .select('slug, title, thumbnail')
    .eq('church_id', church.id)
    .order('recorded_date', { ascending: false })
    .limit(8);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">{church.name}</h1>
      <p className="text-slate-500">
        {church.town}, {church.island_province}
      </p>
      {church.description && <p className="mt-4">{church.description}</p>}
      {church.worship_times && (
        <p className="mt-2 text-sm text-slate-600">Worship times: {church.worship_times}</p>
      )}

      {liveNow && liveNow.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold">Current Livestream</h2>
          {/* link to /watch/[slug] */}
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-semibold">Recent Videos</h2>
        {/* grid of /video/[slug] cards from `videos` */}
      </section>
    </div>
  );
}
