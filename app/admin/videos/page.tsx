import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { deleteVideo, toggleVideoApproved } from './actions';

export default async function AdminVideosPage() {
  const supabase = createClient();
  const { data: videos } = await supabase
    .from('videos')
    .select('id, title, provider, speaker, series, recorded_date, churches(name), events(name), approved')
    .order('recorded_date', { ascending: false, nullsFirst: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Videos</h1>
        <Link href="/admin/videos/edit" className="rounded bg-sky-600 px-4 py-2 text-sm text-white">
          + Add Video
        </Link>
      </div>
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
                {v.series ? ` · ${v.series}` : ''}
                {v.churches?.name ? ` · ${v.churches.name}` : ''}
                {v.events?.name ? ` · ${v.events.name}` : ''}
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
                <button className="text-sm text-red-600 underline">Delete</button>
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

