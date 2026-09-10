import { requireEditor } from '@/lib/requireEditor';
import { saveMyChurch, saveMyMinistry } from './actions';

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

export default async function ManageProfilePage() {
  const { supabase, scope } = await requireEditor();
  const { data: countries } = await supabase.from('countries').select('id, name').order('name');

  if (scope.type === 'church') {
    const { data: church } = await supabase.from('churches').select('*').eq('id', scope.id).single();

    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold">Your Church Profile</h1>
        <p className="mb-6 text-sm text-slate-500">
          Manage {church?.name}'s public listing. Changes go live immediately.
        </p>
        <form action={saveMyChurch} className="max-w-xl space-y-4">
          <Field label="Name" name="name" defaultValue={church?.name} required />
          <Field label="Logo/Image URL (optional)" name="logo_url" defaultValue={church?.logo_url} />

          <div>
            <label className="mb-1 block text-sm font-medium">Country</label>
            <select
              name="country_id"
              defaultValue={church?.country_id ?? ''}
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

          <Field label="Island / Province" name="island_province" defaultValue={church?.island_province} />
          <Field label="Town" name="town" defaultValue={church?.town} />
          <Field label="Address" name="address" defaultValue={church?.address} />

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Latitude (optional)"
              name="latitude"
              defaultValue={church?.latitude != null ? String(church.latitude) : ''}
            />
            <Field
              label="Longitude (optional)"
              name="longitude"
              defaultValue={church?.longitude != null ? String(church.longitude) : ''}
            />
          </div>
          <p className="-mt-2 text-xs text-slate-500">
            Powers your pin on the <a href="/map" className="underline">Church Map</a>. To find these:
            open Google Maps, find your church, right-click the exact spot, and click the
            coordinates that appear (e.g. "-17.7404, 168.3219") to copy them — paste the first
            number into Latitude and the second into Longitude.
          </p>

          <Field label="Phone" name="phone" defaultValue={church?.phone} />
          <Field label="Email" name="email" defaultValue={church?.email} />
          <Field label="Website" name="website" defaultValue={church?.website} />
          <Field label="Facebook" name="facebook" defaultValue={church?.facebook} />
          <Field label="YouTube" name="youtube" defaultValue={church?.youtube} />
          <Field label="Worship Times" name="worship_times" defaultValue={church?.worship_times} />

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              name="description"
              rows={4}
              defaultValue={church?.description ?? ''}
              className="w-full rounded border border-slate-300 p-2"
            />
          </div>

          <button type="submit" className="rounded bg-sky-600 px-5 py-2 text-white">
            Save Changes
          </button>
        </form>
      </div>
    );
  }

  // Ministry scope — no coordinate fields here; the map feature is
  // church-only for now (ministries have no latitude/longitude columns
  // and aren't shown on /map).
  const { data: ministry } = await supabase.from('ministries').select('*').eq('id', scope.id).single();

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Your Ministry Profile</h1>
      <p className="mb-6 text-sm text-slate-500">
        Manage {ministry?.name}'s public listing. Changes go live immediately.
      </p>
      <form action={saveMyMinistry} className="max-w-xl space-y-4">
        <Field label="Name" name="name" defaultValue={ministry?.name} required />

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

        <button type="submit" className="rounded bg-sky-600 px-5 py-2 text-white">
          Save Changes
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
