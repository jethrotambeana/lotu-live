import { createClient } from '@/lib/supabaseServer';
import { saveLivestream } from '../actions';

export default async function LivestreamFormPage({ searchParams }: { searchParams: { id?: string } }) {
  const supabase = createClient();
  const [{ data: countries }, { data: churches }, { data: events }] = await Promise.all([
    supabase.from('countries').select('id, name').order('name'),
    supabase.from('churches').select('id, name').order('name'),
    supabase.from('events').select('id, name').order('name'),
  ]);

  let stream: any = null;
  if (searchParams.id) {
    const { data } = await supabase.from('livestreams').select('*').eq('id', searchParams.id).single();
    stream = data;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{stream ? 'Edit Livestream' : 'Add Livestream'}</h1>
      <form action={saveLivestream} className="max-w-xl space-y-4">
        {stream && <input type="hidden" name="id" value={stream.id} />}

        <Field label="Stream Name" name="name" defaultValue={stream?.name} required />
        <Field label="Slug (leave blank to auto-generate)" name="slug" defaultValue={stream?.slug} />

        <div>
          <label className="mb-1 block text-sm font-medium">Type</label>
          <select name="type" defaultValue={stream?.type ?? 'church'} className="w-full rounded border border-slate-300 p-2">
            <option value="church">Church</option>
            <option value="event">Event</option>
            <option value="organisation">Organisation</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Church (if applicable)</label>
          <select name="church_id" defaultValue={stream?.church_id ?? ''} className="w-full rounded border border-slate-300 p-2">
            <option value="">— None —</option>
            {(churches ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Event (if applicable)</label>
          <select name="event_id" defaultValue={stream?.event_id ?? ''} className="w-full rounded border border-slate-300 p-2">
            <option value="">— None —</option>
            {(events ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Only enter the provider's own ID or URL below — never paste iframe/embed HTML. The site
          builds the player from trusted templates for security.
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

        <Field label="Preview Image URL" name="preview_image" defaultValue={stream?.preview_image} />

        <div>
          <label className="mb-1 block text-sm font-medium">Country</label>
          <select name="country_id" defaultValue={stream?.country_id ?? ''} className="w-full rounded border border-slate-300 p-2">
            <option value="">— Select —</option>
            {(countries ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

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

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="visible" defaultChecked={stream?.visible ?? true} />
            Visible on site
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" defaultChecked={stream?.featured ?? false} />
            Featured
          </label>
        </div>

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
