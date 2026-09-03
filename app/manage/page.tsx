import { requireChurchEditor } from '@/lib/requireChurchEditor';
import { saveMyChurch } from './actions';

export default async function ManageChurchPage() {
  const { supabase, churchId } = await requireChurchEditor();
  const [{ data: countries }, { data: church }] = await Promise.all([
    supabase.from('countries').select('id, name').order('name'),
    supabase.from('churches').select('*').eq('id', churchId).single(),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Your Church Profile</h1>
      <p className="mb-6 text-sm text-slate-500">
        Manage {church?.name}'s public listing. Changes go live immediately.
      </p>
      <form action={saveMyChurch} className="max-w-xl space-y-4">
        <Field label="Name" name="name" defaultValue={church?.name} required />
        <Field
          label="Logo/Image URL (optional)"
          name="logo_url"
          defaultValue={church?.logo_url}
        />

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
