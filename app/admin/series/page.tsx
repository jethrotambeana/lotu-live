import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import Image from 'next/image';
import { deleteSeries } from './actions';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

export default async function AdminSeriesPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const { data: seriesList } = await supabase
    .from('series')
    .select('id, name, slug, cover_image, videos(count)')
    .order('name');

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Series</h1>
        <Link href="/admin/series/edit" className="rounded bg-sky-600 px-4 py-2 text-sm text-white">
          + Add Series
        </Link>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Group multi-part videos (sermon series, campaign nights, etc.) so they show as one
        expandable entry on the public Videos page instead of flooding the list. Assign a video to
        a series from its own edit page (Admin → Videos).
      </p>

      {searchParams.error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}

      <div className="space-y-2">
        {(seriesList ?? []).map((s: any) => {
          const count = s.videos?.[0]?.count ?? 0;
          return (
            <div key={s.id} className="flex items-center justify-between rounded border border-slate-200 p-3">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded bg-slate-100">
                  {s.cover_image && <Image src={s.cover_image} alt={s.name} fill className="object-cover" />}
                </div>
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-slate-500">
                    {count} episode{count === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/admin/series/edit?id=${s.id}`} className="text-sm text-sky-600 underline">
                  Edit / Reorder
                </Link>
                <form action={deleteSeries}>
                  <input type="hidden" name="id" value={s.id} />
                  <ConfirmSubmitButton
                    confirmMessage={`Delete "${s.name}"? This unfiles ${count} video${count === 1 ? '' : 's'} from it but doesn't delete them.`}
                    className="text-sm text-red-600 underline"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </div>
            </div>
          );
        })}
        {(!seriesList || seriesList.length === 0) && (
          <p className="text-slate-500">No series yet — click "Add Series" to create one.</p>
        )}
      </div>
    </div>
  );
}
