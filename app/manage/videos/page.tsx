import { requireChurchEditor } from '@/lib/requireChurchEditor';
import Link from 'next/link';
import { deleteMyVideo } from './actions';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

export default async function ManageVideosPage() {
  const { supabase, churchId } = await requireChurchEditor();
  const { data: videos } = await supabase
    .from('videos')
    .select('id, title, provider, speaker, recorded_date, approved')
    .eq('church_id', churchId)
    .order('recorded_date', { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Videos</h1>
        <Link href="/manage/videos/edit" className="rounded bg-sky-600 px-4 py-2 text-sm text-white">
          + Add Video
        </Link>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        New videos and any edits go live only after an admin approves them.
      </p>
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
                {v.recorded_date ? ` · ${v.recorded_date}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/manage/videos/edit?id=${v.id}`} className="text-sm text-sky-600 underline">
                Edit
              </Link>
              <form action={deleteMyVideo}>
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
          <p className="text-slate-500">No videos yet — click "Add Video" to create one.</p>
        )}
      </div>
    </div>
  );
}

