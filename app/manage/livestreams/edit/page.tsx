import { notFound } from 'next/navigation';
import { requireEditor } from '@/lib/requireEditor';
import { saveLivestreamDetails, addScheduleSlot, saveScheduleSlots } from '../actions';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default async function ManageLivestreamEditPage({
  searchParams,
}: {
  searchParams: { id?: string; error?: string; saved?: string };
}) {
  const { supabase, scope } = await requireEditor();
  if (!searchParams.id) return notFound();

  const { data: stream } = await supabase.from('livestreams').select('*').eq('id', searchParams.id).single();
  if (!stream) return notFound();

  // RLS already scopes what an editor's session can even read here, but a
  // defensive check keeps a mismatched id from ever silently rendering
  // someone else's stream if that scoping were ever loosened by mistake.
  const belongsToEditor =
    scope.type === 'church' ? stream.church_id === scope.id : stream.ministry_id === scope.id;
  if (!belongsToEditor) return notFound();

  const [{ data: categories }, { data: schedules }] = await Promise.all([
    supabase.from('categories').select('id, name').order('name'),
    supabase.from('stream_schedules').select('*').eq('livestream_id', stream.id).order('day_of_week'),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Edit Livestream</h1>

      {searchParams.error && (
        <div className="mb-4 max-w-xl rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}
      {searchParams.saved && (
        <div className="mb-4 max-w-xl rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Changes saved.
        </div>
      )}

      <div className="mb-6 max-w-xl rounded border border-slate-200 bg-slate-50 p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Set by your admin</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Stream source</dt>
            <dd className="font-medium capitalize">{stream.provider}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Status</dt>
            <dd className="font-medium capitalize">{stream.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Public visibility</dt>
            <dd className="font-medium">{stream.visible ? 'Visible on site' : 'Hidden'}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          Contact your site admin to change the stream source or make this visible/hidden.
        </p>
      </div>

      <form action={saveLivestreamDetails} className="max-w-xl space-y-4">
        <input type="hidden" name="id" value={stream.id} />

        <Field label="Stream Name" name="name" defaultValue={stream.name} required />
        <Field label="Slug (leave blank to auto-generate)" name="slug" defaultValue={stream.slug} />
        <Field
          label="Preview Image URL"
          name="preview_image"
          defaultValue={stream.preview_image}
          placeholder="Shown as the thumbnail before/after the stream is live"
        />
        <Field label="Location" name="location" defaultValue={stream.location} placeholder="e.g. Main Sanctuary" />
        <Field label="Language" name="language" defaultValue={stream.language} />

        <div>
          <label className="mb-1 block text-sm font-medium">Category</label>
          <select
            name="category_id"
            defaultValue={stream.category_id ?? ''}
            className="w-full rounded border border-slate-300 p-2"
          >
            <option value="">— None —</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Start At (for a specific broadcast)"
            name="start_at"
            type="datetime-local"
            defaultValue={stream.start_at}
          />
          <Field label="End At" name="end_at" type="datetime-local" defaultValue={stream.end_at} />
        </div>

        <button type="submit" className="rounded bg-sky-600 px-5 py-2 text-white">
          Save Changes
        </button>
      </form>

      <div className="mt-8 max-w-xl rounded border border-slate-200 p-4">
        <h2 className="mb-1 font-semibold">Weekly Schedule</h2>
        <p className="mb-3 text-sm text-slate-500">
          Recurring times this stream normally goes live — shown to visitors when it's currently
          offline, so they know when to check back.
        </p>

        {schedules && schedules.length > 0 ? (
          <form action={saveScheduleSlots} className="space-y-2">
            <input type="hidden" name="livestreamId" value={stream.id} />
            {schedules.map((s: any) => (
              <div key={s.id} className="flex items-center gap-2 rounded border border-slate-200 p-2">
                <input type="hidden" name="scheduleId" value={s.id} />
                <select
                  name="dayOfWeek"
                  defaultValue={s.day_of_week}
                  className="rounded border border-slate-300 p-1.5 text-sm"
                >
                  {DAY_NAMES.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  name="startTime"
                  defaultValue={s.start_time?.slice(0, 5)}
                  className="rounded border border-slate-300 p-1.5 text-sm"
                />
                <label className="ml-auto flex items-center gap-1.5 text-sm text-red-600">
                  <input type="checkbox" name="remove" value={s.id} />
                  Remove
                </label>
              </div>
            ))}
            <button type="submit" className="mt-2 rounded bg-sky-600 px-4 py-2 text-sm text-white">
              Save Schedule
            </button>
          </form>
        ) : (
          <p className="mb-3 text-sm text-slate-500">No recurring times set yet.</p>
        )}

        <form action={addScheduleSlot} className="mt-4 flex items-end gap-2 border-t border-slate-200 pt-4">
          <input type="hidden" name="livestreamId" value={stream.id} />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Day</label>
            <select name="dayOfWeek" defaultValue="6" className="rounded border border-slate-300 p-1.5 text-sm">
              {DAY_NAMES.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Time</label>
            <input type="time" name="startTime" required className="rounded border border-slate-300 p-1.5 text-sm" />
          </div>
          <button type="submit" className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            + Add Time
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  type = 'text',
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ''}
        required={required}
        placeholder={placeholder}
        className="w-full rounded border border-slate-300 p-2"
      />
    </div>
  );
}
