import { createClient } from '@/lib/supabaseServer';
import { saveVideo } from '../actions';

export default async function VideoFormPage({ searchParams }: { searchParams: { id?: string } }) {
  const supabase = createClient();
  const [{ data: churches }, { data: events }, { data: categories }] = await Promise.all([
    supabase.from('churches').select('id, name').order('name'),
    supabase.from('events').select('id, name').order('name'),
    supabase.from('categories').select('id, name').order('name'),
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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{video ? 'Edit Video' : 'Add Video'}</h1>
      <form action={saveVideo} className="max-w-xl space-y-4">
        {video && <input type="hidden" name="id" value={video.id} />}

        <Field label="Title" name="title" defaultValue={video?.title} required />
        <Field label="Slug (leave blank to auto-generate)" name="slug" defaultValue={video?.slug} />

        <div>
          <label className="mb-1 block text-sm font-medium">Church (if applicable)</label>
          <select
            name="church_id"
            defaultValue={video?.church_id ?? ''}
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
          <label className="mb-1 block text-sm font-medium">Event (if applicable)</label>
          <select
            name="event_id"
            defaultValue={video?.event_id ?? ''}
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
        <Field label="Series" name="series" defaultValue={video?.series} />

        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Only enter the provider's own ID or URL below — never paste iframe/embed HTML. The site
          builds the player from trusted templates for security.
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Provider</label>
          <select
            name="provider"
            defaultValue={video?.provider ?? 'youtube'}
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
          defaultValue={video?.provider_video_id}
          required
          placeholder="e.g. YouTube video ID, Cloudflare video UID, or Cloudinary public ID"
        />

        <Field
          label="Thumbnail URL (optional — auto-filled from YouTube if left blank)"
          name="thumbnail"
          defaultValue={video?.thumbnail}
        />
        <Field label="Language" name="language" defaultValue={video?.language} />

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
