import { createClient } from '@/lib/supabaseServer';
import { saveSeries, saveEpisodeOrder } from '../actions';

export default async function SeriesFormPage({
  searchParams,
}: {
  searchParams: { id?: string; error?: string };
}) {
  const supabase = createClient();

  let series: any = null;
  let episodes: any[] = [];
  if (searchParams.id) {
    const { data } = await supabase.from('series').select('*').eq('id', searchParams.id).single();
    series = data;

    const { data: eps } = await supabase
      .from('videos')
      .select('id, title, thumbnail, episode_number, recorded_date')
      .eq('series_id', searchParams.id)
      .order('episode_number', { ascending: true, nullsFirst: false })
      .order('recorded_date', { ascending: true });
    episodes = eps ?? [];
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{series ? 'Edit Series' : 'Add Series'}</h1>

      {searchParams.error && (
        <div className="mb-4 max-w-xl rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}

      <form action={saveSeries} className="max-w-xl space-y-4">
        {series && <input type="hidden" name="id" value={series.id} />}

        <Field label="Name" name="name" defaultValue={series?.name} required />
        <Field label="Slug (leave blank to auto-generate)" name="slug" defaultValue={series?.slug} />
        <Field
          label="Cover Image URL (optional — falls back to the first episode's thumbnail if left blank)"
          name="cover_image"
          defaultValue={series?.cover_image}
        />

        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={series?.description ?? ''}
            className="w-full rounded border border-slate-300 p-2"
          />
        </div>

        <button type="submit" className="rounded bg-sky-600 px-5 py-2 text-white">
          {series ? 'Save Changes' : 'Create Series'}
        </button>
      </form>

      {series && (
        <div className="mt-8 max-w-xl rounded border border-slate-200 p-4">
          <h2 className="mb-1 font-semibold">Episodes ({episodes.length})</h2>
          <p className="mb-3 text-sm text-slate-500">
            Set each episode's number to control display order on the public series page — lowest
            first. To add a video to this series, edit it under Admin → Videos and pick "{series.name}"
            from the Series dropdown.
          </p>

          {episodes.length > 0 ? (
            <form action={saveEpisodeOrder} className="space-y-2">
              <input type="hidden" name="seriesId" value={series.id} />
              {episodes.map((ep: any) => (
                <div key={ep.id} className="flex items-center gap-3 rounded border border-slate-200 p-2">
                  <input type="hidden" name="videoId" value={ep.id} />
                  <input
                    type="number"
                    name="episodeNumber"
                    defaultValue={ep.episode_number ?? ''}
                    placeholder="#"
                    className="w-16 rounded border border-slate-300 p-1.5 text-center text-sm"
                  />
                  <span className="flex-1 truncate text-sm">{ep.title}</span>
                  <span className="shrink-0 text-xs text-slate-400">{ep.recorded_date ?? ''}</span>
                </div>
              ))}
              <button type="submit" className="mt-2 rounded bg-sky-600 px-4 py-2 text-sm text-white">
                Save Episode Order
              </button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">No videos assigned to this series yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue ?? ''}
        required={required}
        className="w-full rounded border border-slate-300 p-2"
      />
    </div>
  );
}
