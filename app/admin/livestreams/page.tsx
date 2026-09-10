import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { deleteLivestream, toggleVisible } from './actions';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

const STALE_DAYS = 21;

function daysSince(dateString: string | null): number | null {
  if (!dateString) return null;
  return Math.floor((Date.now() - new Date(dateString).getTime()) / (24 * 60 * 60 * 1000));
}

export default async function AdminLivestreamsPage() {
  const supabase = createClient();
  const { data: streams } = await supabase
    .from('livestreams')
    .select('id, name, provider, status, visible, last_live_at, countries(name), churches(name), ministries(name)')
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
        {(streams ?? []).map((s: any) => {
          // Only meaningful for Cloudflare — that's the only provider
          // with automatic live/offline visibility, so last_live_at is
          // never populated for the others (see sql migration comments).
          const since = s.provider === 'cloudflare' ? daysSince(s.last_live_at) : null;
          const isStale = s.provider === 'cloudflare' && (since === null || since >= STALE_DAYS);

          return (
            <div key={s.id} className="flex items-center justify-between rounded border border-slate-200 p-3">
              <div>
                <span
                  className={`mr-2 text-xs font-semibold uppercase ${
                    s.status === 'live' ? 'text-red-600' : 'text-slate-400'
                  }`}
                >
                  {s.status}
                </span>
                {isStale && (
                  <span
                    className="mr-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase text-amber-700"
                    title="Hasn't gone live recently — worth checking in with this church/ministry"
                  >
                    {since === null ? 'Never streamed' : `Inactive ${since}d`}
                  </span>
                )}
                <span className="font-medium">{s.name}</span>
                <p className="text-sm text-slate-500">
                  {s.provider} · {s.countries?.name}
                  {s.churches?.name ? ` · ${s.churches.name}` : ''}
                  {s.ministries?.name ? ` · ${s.ministries.name}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <form action={toggleVisible}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="visible" value={String(s.visible)} />
                  <button className="text-sm underline">{s.visible ? 'Hide' : 'Show'}</button>
                </form>
                <Link
                  href={`/admin/videos/edit?fromLivestream=${s.id}`}
                  className="text-sm text-sky-600 underline"
                  title="Pre-fill a new Video from this livestream's details — you'll review and confirm before it's saved"
                >
                  Convert to Video
                </Link>
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
          );
        })}
        {(!streams || streams.length === 0) && (
          <p className="text-slate-500">No livestreams yet — click "Add Livestream" to create one.</p>
        )}
      </div>
    </div>
  );
}
