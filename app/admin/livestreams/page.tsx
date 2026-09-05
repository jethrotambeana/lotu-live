import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { deleteLivestream, toggleVisible } from './actions';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

export default async function AdminLivestreamsPage() {
  const supabase = createClient();
  const { data: streams } = await supabase
    .from('livestreams')
    .select('id, name, provider, status, visible, countries(name)')
    .order('name');

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Livestreams</h1>
        <Link href="/admin/livestreams/edit" className="rounded bg-sky-600 px-4 py-2 text-sm text-white">
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
              <p className="text-sm text-slate-500">
                {s.provider} · {s.countries?.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <form action={toggleVisible}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="visible" value={String(s.visible)} />
                <button className="text-sm underline">{s.visible ? 'Hide' : 'Show'}</button>
              </form>
              <Link href={`/admin/livestreams/edit?id=${s.id}`} className="text-sm text-sky-600 underline">
                Edit
              </Link>
              <form action={deleteLivestream}>
                <input type="hidden" name="id" value={s.id} />
                <ConfirmSubmitButton
                  confirmMessage={`Delete "${s.name}"? This can't be undone.`}
                  className="text-sm text-red-600 underline"
                >
                  Delete
                </ConfirmSubmitButton>
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
