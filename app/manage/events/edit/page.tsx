import { requireChurchEditor } from '@/lib/requireChurchEditor';
import { notFound } from 'next/navigation';
import { saveMyEvent } from '../actions';

export default async function ManageEventFormPage({ searchParams }: { searchParams: { id?: string } }) {
  const { supabase, churchId } = await requireChurchEditor();
  const { data: countries } = await supabase.from('countries').select('id, name').order('name');

  let event: any = null;
  if (searchParams.id) {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('id', searchParams.id)
      .eq('host_church_id', churchId)
      .single();
    if (!data) return notFound();
    event = data;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{event ? 'Edit Event' : 'Add Event'}</h1>
      <form action={saveMyEvent} className="max-w-xl space-y-4">
        {event && <input type="hidden" name="id" value={event.id} />}

        <Field label="Event Name" name="name" defaultValue={event?.name} required />
        <Field label="Slug (leave blank to auto-generate)" name="slug" defaultValue={event?.slug} />

        <div>
          <label className="mb-1 block text-sm font-medium">Country</label>
          <select name="country_id" defaultValue={event?.country_id ?? ''} className="w-full rounded border border-slate-300 p-2">
            <option value="">— Select —</option>
            {(countries ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Field label="Venue" name="venue" defaultValue={event?.venue} />
        <Field label="Town" name="town" defaultValue={event?.town} />
        <Field label="Island / Province" name="island_province" defaultValue={event?.island_province} />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Date" name="start_date" type="date" defaultValue={event?.start_date} />
          <Field label="End Date" name="end_date" type="date" defaultValue={event?.end_date} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Time" name="start_time" type="time" defaultValue={event?.start_time} />
          <Field label="End Time" name="end_time" type="time" defaultValue={event?.end_time} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Status</label>
          <select name="status" defaultValue={event?.status ?? 'upcoming'} className="w-full rounded border border-slate-300 p-2">
            <option value="upcoming">Upcoming</option>
            <option value="current">Current</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <Field label="Website" name="website" defaultValue={event?.website} />
        <Field label="Facebook" name="facebook" defaultValue={event?.facebook} />
        <Field label="YouTube" name="youtube" defaultValue={event?.youtube} />
        <Field label="Poster Image URL" name="poster_url" defaultValue={event?.poster_url} />

        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            name="description"
            rows={4}
            defaultValue={event?.description}
            className="w-full rounded border border-slate-300 p-2"
          />
        </div>

        <button type="submit" className="rounded bg-sky-600 px-5 py-2 text-white">
          {event ? 'Save Changes' : 'Create Event'}
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
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ''}
        required={required}
        className="w-full rounded border border-slate-300 p-2"
      />
    </div>
  );
}
