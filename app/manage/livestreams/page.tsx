import { requireEditor } from '@/lib/requireEditor';
import Link from 'next/link';
import Image from 'next/image';

export default async function ManageLivestreamsPage() {
  const { supabase, scope } = await requireEditor();

  const { data: streams } = await supabase
    .from('livestreams')
    .select('id, name, slug, status, visible, preview_image')
    .eq(scope.type === 'church' ? 'church_id' : 'ministry_id', scope.id)
    .order('name');

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Your Livestreams</h1>
      <p className="mb-6 text-sm text-slate-500">
        Your site admin sets up the stream source and controls whether it's publicly visible — from
        here you can manage the display details (name, thumbnail, location, language, schedule).
      </p>

      {streams && streams.length > 0 ? (
        <div className="max-w-xl space-y-2">
          {streams.map((s) => (
            <Link
              key={s.id}
              href={`/manage/livestreams/edit?id=${s.id}`}
              className="flex items-center gap-3 rounded border border-slate-200 p-3 hover:shadow-md transition-shadow"
            >
              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded bg-slate-100">
                {s.preview_image && <Image src={s.preview_image} alt={s.name} fill className="object-cover" />}
              </div>
              <div className="flex-1">
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-slate-500">
                  <span
                    className={
                      s.status === 'live' ? 'font-semibold uppercase text-red-600' : 'uppercase text-slate-400'
                    }
                  >
                    {s.status}
                  </span>
                  {' · '}
                  {s.visible ? 'Visible on site' : 'Hidden by admin'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-slate-500">
          No livestream has been set up for you yet — contact your site admin to get one added.
        </p>
      )}
    </div>
  );
}
