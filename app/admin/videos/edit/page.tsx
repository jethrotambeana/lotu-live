import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { saveVideo } from '../actions';

export default async function VideoFormPage({
  searchParams,
}: {
  searchParams: { id?: string; fromLivestream?: string };
}) {
  const supabase = createClient();
  const [{ data: churches }, { data: ministries }, { data: events }, { data: categories }, { data: seriesList }] =
    await Promise.all([
      supabase.from('churches').select('id, name').order('name'),
      supabase.from('ministries').select('id, name').order('name'),
      supabase.from('events').select('id, name').order('name'),
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('series').select('id, name').order('name'),
    ]);

  let video: any = null;
  let selectedCategoryIds: string[] = [];

  if (searchParams.id) {
    const { data } = await supabase.from('videos').select('*').eq('id', searchParams.id).single();
    video = data;

    const { data: links } = await supabase
      .from('video_categories')
      .select('category_id')
      .eq('video_id', searchParams.id);
    selectedCategoryIds = (links ?? []).map((l: any) => l.category_id);
  }

  // Arriving from Admin → Livestreams' "Convert to Video" link: pre-fill a
  // brand-new video's defaults from that livestream, rather than starting
  // blank. Only applies when adding (no existing video `id`) — this is a
  // one-time pre-fill, not a permanent link between the two records.
  let fromStream: any = null;
  if (!searchParams.id && searchParams.fromLivestream) {
    const { data } = await supabase
      .from('livestreams')
      .select('*')
      .eq('id', searchParams.fromLivestream)
      .single();
    fromStream = data;
  }

  const defaults = video ?? {
    title: fromStream?.name ?? '',
    church_id: fromStream?.church_id ?? '',
    ministry_id: fromStream?.ministry_id ?? '',
    event_id: fromStream?.event_id ?? '',
    provider: fromStream?.provider === 'facebook' || fromStream?.provider === 'hls' ? '' : fromStream?.provider ?? '',
    provider_video_id: fromStream?.provider_stream_id ?? '',
    thumbnail: fromStream?.preview_image ?? '',
    language: fromStream?.language ?? '',
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">{video ? 'Edit Video' : 'Add Video'}</h1>

      {fromStream && (
        <div className="mb-6 max-w-xl rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p>
            Pre-filled from the livestream <strong>{fromStream.name}</strong>. Review everything below
            before saving — nothing is created until you click "Create Video."
          </p>
          {fromStream.provider === 'cloudflare' && (
            <p className="mt-2">
              <strong>Cloudflare note:</strong> the Provider Video ID below is that stream's Live
              Input ID, not necessarily its finished recording's own ID — pasting it as-is may not
              play the right thing. Cloudflare recordings are normally imported automatically once a
              stream ends (see the automatic import feature); use this form to correct the ID to the
              actual recording's UID from your Cloudflare dashboard if you're doing this manually.
            </p>
          )}
          {(fromStream.provider === 'facebook' || fromStream.provider === 'hls') && (
            <p className="mt-2">
              <strong>Note:</strong> {fromStream.provider === 'facebook' ? 'Facebook' : 'HLS'} isn't a
              valid Video provider — Provider has been left blank below; pick Cloudflare, YouTube, or
              Cloudinary and paste the correct recording ID/URL for that platform if one exists
              separately from the live stream.
            </p>
          )}
        </div>
      )}

      <form action={saveVideo} className="max-w-xl space-y-4">
        {video && <input type="hidden" name="id" value={video.id} />}

        <Field label="Title" name="title" defaultValue={defaults.title} required />
        <Field label="Slug (leave blank to auto-generate)" name="slug" defaultValue={video?.slug} />

        <div>
          <label className="mb-1 block text-sm font-medium">Church (if applicable)</label>
          <select
            name="church_id"
            defaultValue={defaults.church_id ?? ''}
            className="w-full rounded border border-slate-300 p-2"
          >
            <option value="">— None —</option>
            {(churches ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Ministry (if applicable)</label>
          <select
            name="ministry_id"
            defaultValue={defaults.ministry_id ?? ''}
            className="w-full rounded border border-slate-300 p-2"
          >
            <option value="">— None —</option>
            {(ministries ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">A video should normally belong to a Church OR a Ministry, not both.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Event (if applicable)</label>
          <select
            name="event_id"
            defaultValue={defaults.event_id ?? ''}
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

        <Field label="Speaker" name="speaker" defaultValue={video?.speaker} />

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Series (if part of one)</label>
            <select
              name="series_id"
              defaultValue={video?.series_id ?? ''}
              className="w-full rounded border border-slate-300 p-2"
            >
              <option value="">— None —</option>
              {(seriesList ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Episode #</label>
            <input
              type="number"
              name="episode_number"
              defaultValue={video?.episode_number ?? ''}
              className="w-full rounded border border-slate-300 p-2"
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-slate-500">
          Don't see the series you need?{' '}
          <Link href="/admin/series/edit" className="text-sky-600 underline">
            Create one
          </Link>{' '}
          first, then come back here.
        </p>

        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Only enter the provider's own ID or URL below — never paste iframe/embed HTML. The site
          builds the player from trusted templates for security.
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Provider</label>
          <select
            name="provider"
            defaultValue={defaults.provider || 'youtube'}
            className="w-full rounded border border-slate-300 p-2"
          >
            <option value="cloudflare">Cloudflare Stream</option>
            <option value="youtube">YouTube</option>
            <option value="cloudinary">Cloudinary</option>
          </select>
        </div>

        <Field
          label="Provider Video ID / URL"
          name="provider_video_id"
          defaultValue={defaults.provider_video_id}
          required
          placeholder="e.g. YouTube video ID, Cloudflare video UID, or Cloudinary public ID"
        />

        <Field
          label="Thumbnail URL (auto-filled for YouTube and Cloudflare Stream if left blank — paste manually for Cloudinary)"
          name="thumbnail"
          defaultValue={defaults.thumbnail}
        />
        <Field label="Language" name="language" defaultValue={defaults.language} />

        <div>
          <label className="mb-1 block text-sm font-medium">Recorded Date</label>
          <input
            type="date"
            name="recorded_date"
            defaultValue={video?.recorded_date ?? ''}
            className="w-full rounded border border-slate-300 p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            name="description"
            defaultValue={video?.description ?? ''}
            rows={4}
            className="w-full rounded border border-slate-300 p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Categories</label>
          <div className="grid grid-cols-2 gap-2 rounded border border-slate-200 p-3">
            {(categories ?? []).map((cat: any) => (
              <label key={cat.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="category_ids"
                  value={cat.id}
                  defaultChecked={selectedCategoryIds.includes(cat.id)}
                />
                {cat.name}
              </label>
            ))}
            {(!categories || categories.length === 0) && (
              <p className="col-span-2 text-sm text-slate-500">No categories set up yet.</p>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="approved" defaultChecked={video?.approved ?? true} />
          Approved (visible on the public site — uncheck to hide while under review)
        </label>

        <button type="submit" className="rounded bg-sky-600 px-5 py-2 text-white">
          {video ? 'Save Changes' : 'Create Video'}
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
