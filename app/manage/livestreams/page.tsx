import { requireChurchEditor } from '@/lib/requireChurchEditor';
import Link from 'next/link';
import { deleteMyLivestream, toggleMyVisible } from './actions';

export default async function ManageLivestreamsPage() {
  const { supabase, churchId } = await requireChurchEditor();
  const { data: streams } = await supabase
    .from('livestreams')
    .select('id, name, provider, status, visible')
    .eq('church_id', churchId)
    .order('name');

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Livestreams</h1>
        <Link href="/manage/livestreams/edit" className="rounded bg-sky-600 px-4 py-2 text-sm text-white">
          + Add Livestream
        </Link>
      </div>
      <div className="space-y-2">
        {(streams ?? []).map((s: any) => (
          <div key={s.id} className="flex items-center justify-between rounded border border-slate-200 p-3">
            <div>
              <span
                className={`mr-2 text-xs font-semibold uppercase ${
                  s.status === 'live' ? 'text-red-600' : 'text-slate-400'
                }`}
              >
                {s.status}
              </span>
              <span className="font-medium">{s.name}</span>
              <p className="text-sm text-slate-500">{s.provider}</p>
            </div>
            <div className="flex items-center gap-3">
              <form action={toggleMyVisible}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="visible" value={String(s.visible)} />
                <button className="text-sm underline">{s.visible ? 'Hide' : 'Show'}</button>
              </form>
              <Link href={`/manage/livestreams/edit?id=${s.id}`} className="text-sm text-sky-600 underline">
                Edit
              </Link>
              <form action={deleteMyLivestream}>
                <input type="hidden" name="id" value={s.id} />
                <button className="text-sm text-red-600 underline">Delete</button>
              </form>
            </div>
          </div>
        ))}
        {(!streams || streams.length === 0) && (
          <p className="text-slate-500">No livestreams yet — click "Add Livestream" to create one.</p>
        )}
      </div>
    </div>
  );
}
