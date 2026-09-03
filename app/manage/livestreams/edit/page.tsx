import { requireChurchEditor } from '@/lib/requireChurchEditor';
import { notFound } from 'next/navigation';
import { saveMyLivestream } from '../actions';

export default async function ManageLivestreamFormPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const { supabase, churchId } = await requireChurchEditor();

  const { data: events } = await supabase
    .from('events')
    .select('id, name')
    .eq('host_church_id', churchId)
    .order('name');

  let stream: any = null;
  if (searchParams.id) {
    // Scoped to churchId — an editor can't open another church's stream by
    // guessing its id; RLS would block the underlying read/write regardless.
    const { data } = await supabase
      .from('livestreams')
      .select('*')
      .eq('id', searchParams.id)
      .eq('church_id', churchId)
      .single();
    if (!data) return notFound();
    stream = data;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{stream ? 'Edit Livestream' : 'Add Livestream'}</h1>
      <form action={saveMyLivestream} className="max-w-xl space-y-4">
        {stream && <input type="hidden" name="id" value={stream.id} />}

        <Field label="Stream Name" name="name" defaultValue={stream?.name} required />
        <Field label="Slug (leave blank to auto-generate)" name="slug" defaultValue={stream?.slug} />

        <div>
          <label className="mb-1 block text-sm font-medium">Event (if applicable)</label>
          <select
            name="event_id"
            defaultValue={stream?.event_id ?? ''}
            className="w-full rounded border border-slate-300 p-2"
          >
            <option value="">— None —</option>
            {(events ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Only enter the provider's own ID or URL below — never paste iframe/embed HTML.
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Provider</label>
          <select
            name="provider"
            defaultValue={stream?.provider ?? 'youtube'}
            className="w-full rounded border border-slate-300 p-2"
          >
            <option value="cloudflare">Cloudflare Stream</option>
            <option value="youtube">YouTube</option>
            <option value="facebook">Facebook</option>
            <option value="hls">HLS URL</option>
          </select>
        </div>

        <Field
          label="Provider Stream ID / URL"
          name="provider_stream_id"
          defaultValue={stream?.provider_stream_id}
          required
          placeholder="e.g. YouTube video ID, Cloudflare Live Input ID, or full .m3u8 URL"
        />

        <Field
          label="Preview Image URL (auto-filled for YouTube/Cloudflare Stream if left blank)"
          name="preview_image"
          defaultValue={stream?.preview_image}
        />

        <Field label="Island / Province" name="island_province" defaultValue={stream?.island_province} />
        <Field label="Location" name="location" defaultValue={stream?.location} />
        <Field label="Language" name="language" defaultValue={stream?.language} />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start At" name="start_at" type="datetime-local" defaultValue={stream?.start_at} />
          <Field label="End At" name="end_at" type="datetime-local" defaultValue={stream?.end_at} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Status</label>
          <select name="status" defaultValue={stream?.status ?? 'offline'} className="w-full rounded border border-slate-300 p-2">
            <option value="live">Live</option>
            <option value="offline">Offline</option>
            <option value="upcoming">Upcoming</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="visible" defaultChecked={stream?.visible ?? true} />
          Visible on site
        </label>

        <button type="submit" className="rounded bg-sky-600 px-5 py-2 text-white">
          {stream ? 'Save Changes' : 'Create Livestream'}
        </button>
      </form>
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
