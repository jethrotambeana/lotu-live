import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import Image from 'next/image';
import { deleteMinistry, unlinkMinistryEditors } from './actions';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

const MINISTRY_TYPE_LABELS: Record<string, string> = {
  music_singing: 'Music / Singing',
  media_video: 'Media / Video',
  livestream_team: 'Livestream Team',
  youth: 'Youth',
  outreach: 'Outreach',
  prayer: 'Prayer',
  childrens: "Children's",
  other: 'Other',
};

export default async function AdminMinistriesPage({
  searchParams,
}: {
  searchParams: { error?: string; blockedId?: string };
}) {
  const supabase = createClient();
  const { data: ministries } = await supabase
    .from('ministries')
    .select('id, name, type, town, churches(name), logo_url')
    .order('name');

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ministries</h1>
        <Link href="/admin/ministries/edit" className="rounded bg-sky-600 px-4 py-2 text-sm text-white">
          + Add Ministry
        </Link>
      </div>
      {searchParams.error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{searchParams.error}</p>
          {searchParams.blockedId && (
            <form action={unlinkMinistryEditors} className="mt-2">
              <input type="hidden" name="ministryId" value={searchParams.blockedId} />
              <button className="rounded border border-red-300 bg-white px-3 py-1 text-sm text-red-700 hover:bg-red-100">
                Unlink Editor Account(s)
              </button>
            </form>
          )}
        </div>
      )}
      <div className="space-y-2">
        {(ministries ?? []).map((m: any) => (
          <div key={m.id} className="flex items-center justify-between rounded border border-slate-200 p-3">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100">
                {m.logo_url && <Image src={m.logo_url} alt={m.name} fill className="object-cover" />}
              </div>
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-sm text-slate-500">
                  {MINISTRY_TYPE_LABELS[m.type] || m.type}
                  {m.town ? ` — ${m.town}` : ''}
                  {m.churches?.name ? ` · Part of ${m.churches.name}` : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/ministries/edit?id=${m.id}`} className="text-sm text-sky-600 underline">
                Edit
              </Link>
              <form action={deleteMinistry}>
                <input type="hidden" name="id" value={m.id} />
                <ConfirmSubmitButton
                  confirmMessage={`Delete "${m.name}"? This can't be undone.`}
                  className="text-sm text-red-600 underline"
                >
                  Delete
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>
        ))}
        {(!ministries || ministries.length === 0) && (
          <p className="text-slate-500">No ministries yet — click "Add Ministry" to create one.</p>
        )}
      </div>
    </div>
  );
}
