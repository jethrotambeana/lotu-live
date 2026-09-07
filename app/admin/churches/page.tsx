import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import Image from 'next/image';
import { deleteChurch, unlinkChurchEditors, toggleChurchActive } from './actions';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

export default async function AdminChurchesPage({
  searchParams,
}: {
  searchParams: { error?: string; blockedId?: string };
}) {
  const supabase = createClient();
  const { data: churches } = await supabase
    .from('churches')
    .select('id, name, slug, town, countries(name), logo_url, active')
    .order('name');

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Churches</h1>
        <Link href="/admin/churches/edit" className="rounded bg-sky-600 px-4 py-2 text-sm text-white">
          + Add Church
        </Link>
      </div>
      {searchParams.error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{searchParams.error}</p>
          {searchParams.blockedId && (
            <form action={unlinkChurchEditors} className="mt-2">
              <input type="hidden" name="churchId" value={searchParams.blockedId} />
              <button className="rounded border border-red-300 bg-white px-3 py-1 text-sm text-red-700 hover:bg-red-100">
                Unlink Editor Account(s)
              </button>
            </form>
          )}
        </div>
      )}
      <div className="space-y-2">
        {(churches ?? []).map((c: any) => (
          <div
            key={c.id}
            className={`flex items-center justify-between rounded border border-slate-200 p-3 ${
              c.active ? '' : 'opacity-60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100">
                {c.logo_url && <Image src={c.logo_url} alt={c.name} fill className="object-cover" />}
              </div>
              <div>
                <p className="font-medium">
                  {c.name}
                  {!c.active && (
                    <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-700">
                      Inactive
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate-500">
                  {c.town} {c.countries?.name ? `— ${c.countries.name}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <form action={toggleChurchActive}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="active" value={(!c.active).toString()} />
                <button
                  className={`rounded border px-3 py-1 text-sm ${
                    c.active
                      ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                  title={
                    c.active
                      ? 'Hide this church (and its events, videos, livestreams) from the public site'
                      : 'Make this church visible on the public site again'
                  }
                >
                  {c.active ? 'Active' : 'Inactive'}
                </button>
              </form>
              <Link href={`/admin/churches/edit?id=${c.id}`} className="text-sm text-sky-600 underline">
                Edit
              </Link>
              <form action={deleteChurch}>
                <input type="hidden" name="id" value={c.id} />
                <ConfirmSubmitButton
                  confirmMessage={`Delete "${c.name}"? This can't be undone.`}
                  className="text-sm text-red-600 underline"
                >
                  Delete
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>
        ))}
        {(!churches || churches.length === 0) && (
          <p className="text-slate-500">No churches yet — click "Add Church" to create one.</p>
        )}
      </div>
    </div>
  );
}
