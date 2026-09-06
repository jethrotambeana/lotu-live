import { createClient } from '@/lib/supabaseServer';
import { saveAboutPage } from './actions';

export default async function AdminAboutPage() {
  const supabase = createClient();
  const { data } = await supabase.from('site_settings').select('value').eq('key', 'about_page').maybeSingle();

  const settings = (data?.value as any) || {};

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">About Page</h1>
      <p className="mb-6 text-sm text-slate-500">
        Controls the content shown on the public <code>/about</code> page. Changes go live
        immediately.
      </p>
      <form action={saveAboutPage} className="max-w-2xl space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Tagline</label>
          <input
            name="tagline"
            defaultValue={settings.tagline ?? ''}
            className="w-full rounded border border-slate-300 p-2"
          />
          <p className="mt-1 text-xs text-slate-500">
            Shown as a subtitle under the "About LOTU.LIVE" heading.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Image URL (optional)</label>
          <input
            name="image_url"
            defaultValue={settings.image_url ?? ''}
            className="w-full rounded border border-slate-300 p-2"
          />
          <p className="mt-1 text-xs text-slate-500">
            Shown above the body content on the About page. Leave blank for no image.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Body Content</label>
          <textarea
            name="content"
            rows={12}
            defaultValue={settings.content ?? ''}
            className="w-full rounded border border-slate-300 p-2"
          />
          <p className="mt-1 text-xs text-slate-500">
            Separate paragraphs with a blank line — each one renders as its own paragraph on the
            page.
          </p>
        </div>

        <button type="submit" className="rounded bg-sky-600 px-5 py-2 text-white">
          Save Changes
        </button>
      </form>
    </div>
  );
}
