import { createClient } from '@/lib/supabaseServer';
import { saveChurch, unlinkChurchEditorFromEdit, grantChurchEditor } from '../actions';

export default async function ChurchFormPage({
  searchParams,
}: {
  searchParams: { id?: string; error?: string };
}) {
  const supabase = createClient();
  const { data: countries } = await supabase.from('countries').select('id, name').order('name');

  let church: any = null;
  let currentEditor: any = null;
  if (searchParams.id) {
    const { data } = await supabase.from('churches').select('*').eq('id', searchParams.id).single();
    church = data;
    const { data: editor } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('church_id', searchParams.id)
      .maybeSingle();
    currentEditor = editor;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{church ? 'Edit Church' : 'Add Church'}</h1>

      {searchParams.error && (
        <div className="mb-4 max-w-xl rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}

      <form action={saveChurch} className="max-w-xl space-y-4">
        {church && <input type="hidden" name="id" value={church.id} />}

        <Field label="Name" name="name" defaultValue={church?.name} required />
        <Field
          label="Slug (leave blank to auto-generate)"
          name="slug"
          defaultValue={church?.slug}
        />

        <Field
          label="Logo/Image URL (optional — shown next to the church in listings and its profile page)"
          name="logo_url"
          defaultValue={church?.logo_url}
        />

        <div>
          <label className="mb-1 block text-sm font-medium">Country</label>
          <select name="country_id" defaultValue={church?.country_id ?? ''} className="w-full rounded border border-slate-300 p-2">
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
            defaultValue={church?.description}
            className="w-full rounded border border-slate-300 p-2"
          />
        </div>

        <button type="submit" className="rounded bg-sky-600 px-5 py-2 text-white">
          {church ? 'Save Changes' : 'Create Church'}
        </button>
      </form>

      {church && (
        <div className="mt-8 max-w-xl rounded border border-slate-200 p-4">
          <h2 className="mb-3 font-semibold">Editor Access</h2>
          {currentEditor ? (
            <div>
              <p className="text-sm text-slate-600">
                <span className="font-medium">{currentEditor.email}</span>{' '}
                {currentEditor.role === 'editor' ? (
                  <span className="text-green-600">(Active)</span>
                ) : (
                  <span className="text-amber-600">(Pending Activation — see Admin → Submissions)</span>
                )}
              </p>
              <form action={unlinkChurchEditorFromEdit} className="mt-2">
                <input type="hidden" name="profileId" value={currentEditor.id} />
                <input type="hidden" name="churchId" value={church.id} />
                <button className="rounded border border-red-300 bg-white px-3 py-1 text-sm text-red-700 hover:bg-red-50">
                  Unlink Editor
                </button>
              </form>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm text-slate-500">
                No editor currently linked. Grant access to someone who already has an account
                (they must sign up at /signup first).
              </p>
              <form action={grantChurchEditor} className="flex gap-2">
                <input type="hidden" name="churchId" value={church.id} />
                <input
                  type="email"
                  name="email"
                  placeholder="editor@example.com"
                  autoComplete="off"
                  required
                  className="flex-1 rounded border border-slate-300 p-2 text-sm"
                />
                <button className="rounded bg-sky-600 px-4 py-2 text-sm text-white whitespace-nowrap">
                  Grant Access
                </button>
              </form>
            </div>
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
