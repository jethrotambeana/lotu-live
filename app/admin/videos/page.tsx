import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { deleteVideo, toggleVideoApproved } from './actions';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import FilterBar from '@/components/FilterBar';
import BackfillDurationsButton from './BackfillDurationsButton';

export default async function AdminVideosPage({
  searchParams,
}: {
  searchParams: { church?: string; ministry?: string };
}) {
  const supabase = createClient();

  const [{ data: churches }, { data: ministries }] = await Promise.all([
    supabase.from('churches').select('id, name').order('name'),
    supabase.from('ministries').select('id, name').order('name'),
  ]);

  let query = supabase
    .from('videos')
    .select(
      'id, title, provider, speaker, recorded_date, churches(name), ministries(name), events(name), series(name), episode_number, approved'
    );

  if (searchParams.church) query = query.eq('church_id', searchParams.church);
  if (searchParams.ministry) query = query.eq('ministry_id', searchParams.ministry);

  const { data: videos } = await query
    .order('approved', { ascending: true }) // pending-approval rows (approved = false) surface first
    .order('recorded_date', { ascending: false, nullsFirst: false });

  const pendingCount = (videos ?? []).filter((v: any) => !v.approved).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Videos</h1>
        <Link href="/admin/videos/edit" className="rounded bg-sky-600 px-4 py-2 text-sm text-white">
          + Add Video
        </Link>
      </div>
      {pendingCount > 0 && (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {pendingCount} video{pendingCount === 1 ? '' : 's'} awaiting approval — shown first in the list below.
        </div>
      )}

      <div className="mb-4">
        <BackfillDurationsButton />
      </div>

      <FilterBar
        filters={[
          {
            name: 'church',
            label: 'All Churches',
            options: (churches ?? []).map((c) => ({ value: c.id, label: c.name })),
          },
          {
            name: 'ministry',
            label: 'All Ministries',
            options: (ministries ?? []).map((m) => ({ value: m.id, label: m.name })),
          },
        ]}
      />

      <div className="space-y-2">
        {(videos ?? []).map((v: any) => (
          <div key={v.id} className="flex items-center justify-between rounded border border-slate-200 p-3">
            <div>
              {!v.approved && (
                <span className="mr-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase text-amber-700">
                  Pending Approval
                </span>
              )}
              <span className="font-medium">{v.title}</span>
              <p className="text-sm text-slate-500">
                {v.provider}
                {v.speaker ? ` · ${v.speaker}` : ''}
                {v.churches?.name ? ` · ${v.churches.name}` : ''}
                {v.ministries?.name ? ` · ${v.ministries.name}` : ''}
                {v.events?.name ? ` · ${v.events.name}` : ''}
                {v.series?.name
                  ? ` · ${v.series.name}${v.episode_number ? ` (Ep. ${v.episode_number})` : ''}`
                  : ''}
                {v.recorded_date ? ` · ${v.recorded_date}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <form action={toggleVideoApproved}>
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="approved" value={String(v.approved)} />
                <button className="text-sm underline">{v.approved ? 'Unapprove' : 'Approve'}</button>
              </form>
              <Link href={`/admin/videos/edit?id=${v.id}`} className="text-sm text-sky-600 underline">
                Edit
              </Link>
              <form action={deleteVideo}>
                <input type="hidden" name="id" value={v.id} />
                <ConfirmSubmitButton
                  confirmMessage={`Delete "${v.title}"? This can't be undone.`}
                  className="text-sm text-red-600 underline"
                >
                  Delete
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>
        ))}
        {(!videos || videos.length === 0) && (
          <p className="text-slate-500">
            {searchParams.church || searchParams.ministry
              ? 'No videos match these filters.'
              : 'No videos yet — click "Add Video" to create one.'}
          </p>
        )}
      </div>
    </div>
  );
}
