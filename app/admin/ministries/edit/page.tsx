import { createClient } from '@/lib/supabaseServer';
import { saveMinistry } from '../actions';

const MINISTRY_TYPES = [
  { value: 'music_singing', label: 'Music / Singing' },
  { value: 'media_video', label: 'Media / Video Production' },
  { value: 'livestream_team', label: 'Livestream Team' },
  { value: 'youth', label: 'Youth' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'prayer', label: 'Prayer' },
  { value: 'childrens', label: "Children's" },
  { value: 'other', label: 'Other' },
];

export default async function MinistryFormPage({ searchParams }: { searchParams: { id?: string } }) {
  const supabase = createClient();
  const [{ data: countries }, { data: churches }] = await Promise.all([
    supabase.from('countries').select('id, name').order('name'),
    supabase.from('churches').select('id, name').order('name'),
  ]);

  let ministry: any = null;
  if (searchParams.id) {
    const { data } = await supabase.from('ministries').select('*').eq('id', searchParams.id).single();
    ministry = data;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{ministry ? 'Edit Ministry' : 'Add Ministry'}</h1>
      <form action={saveMinistry} className="max-w-xl space-y-4">
        {ministry && <input type="hidden" name="id" value={ministry.id} />}

        <Field label="Name" name="name" defaultValue={ministry?.name} required />
        <Field label="Slug (leave blank to auto-generate)" name="slug" defaultValue={ministry?.slug} />

        <div>
          <label className="mb-1 block text-sm font-medium">Type</label>
          <select
            name="type"
            defaultValue={ministry?.type ?? 'other'}
            className="w-full rounded border border-slate-300 p-2"
          >
            {MINISTRY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Part of Church (optional)</label>
          <select
            name="church_id"
            defaultValue={ministry?.church_id ?? ''}
            className="w-full rounded border border-slate-300 p-2"
          >
            <option value="">— None / Independent —</option>
            {(churches ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Field label="Logo/Image URL (optional)" name="logo_url" defaultValue={ministry?.logo_url} />

        <div>
          <label className="mb-1 block text-sm font-medium">Country</label>
          <select
            name="country_id"
            defaultValue={ministry?.country_id ?? ''}
            className="w-full rounded border border-slate-300 p-2"
          >
            <option value="">— Select —</option>
            {(countries ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Field label="Island / Province" name="island_province" defaultValue={ministry?.island_province} />
        <Field label="Town" name="town" defaultValue={ministry?.town} />
        <Field label="Phone" name="phone" defaultValue={ministry?.phone} />
        <Field label="Email" name="email" defaultValue={ministry?.email} />
        <Field label="Website" name="website" defaultValue={ministry?.website} />
        <Field label="Facebook" name="facebook" defaultValue={ministry?.facebook} />
        <Field label="YouTube" name="youtube" defaultValue={ministry?.youtube} />

        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            name="description"
            rows={4}
            defaultValue={ministry?.description ?? ''}
            className="w-full rounded border border-slate-300 p-2"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="approved" defaultChecked={ministry?.approved ?? true} />
          Approved (visible on the public site)
        </label>

        <button type="submit" className="rounded bg-sky-600 px-5 py-2 text-white">
          {ministry ? 'Save Changes' : 'Create Ministry'}
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
