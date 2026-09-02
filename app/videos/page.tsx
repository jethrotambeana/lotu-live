import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import Image from 'next/image';

export default async function VideosPage() {
  const supabase = createClient();
  const { data: videos } = await supabase
    .from('videos')
    .select('slug, title, thumbnail, speaker')
    .order('recorded_date', { ascending: false })
    .limit(24);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Latest Videos</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {(videos ?? []).map((v) => (
          <Link key={v.slug} href={`/video/${v.slug}`} className="block">
            <div className="relative aspect-video overflow-hidden rounded bg-slate-100">
              {v.thumbnail && <Image src={v.thumbnail} alt={v.title} fill className="object-cover" />}
            </div>
            <p className="mt-2 text-sm font-medium">{v.title}</p>
            {v.speaker && <p className="text-xs text-slate-500">{v.speaker}</p>}
          </Link>
        ))}
      </div>
      {/* Category rows (Sermons, Evangelism, Youth, Music, ...) query video_categories */}
    </div>
  );
}
