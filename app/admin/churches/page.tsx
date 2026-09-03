import { createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import Image from 'next/image';
import { deleteChurch } from './actions';

export default async function AdminChurchesPage() {
  const supabase = createClient();
  const { data: churches } = await supabase
    .from('churches')
    .select('id, name, slug, town, countries(name), logo_url')
    .order('name');

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Churches</h1>
        <Link href="/admin/churches/edit" className="rounded bg-sky-600 px-4 py-2 text-sm text-white">
          + Add Church
        </Link>
      </div>
      <div className="space-y-2">
        {(churches ?? []).map((c: any) => (
          <div key={c.id} className="flex items-center justify-between rounded border border-slate-200 p-3">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100">
                {c.logo_url && <Image src={c.logo_url} alt={c.name} fill className="object-cover" />}
              </div>
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-slate-500">
                  {c.town} {c.countries?.name ? `— ${c.countries.name}` : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/churches/edit?id=${c.id}`} className="text-sm text-sky-600 underline">
                Edit
              </Link>
              <form action={deleteChurch}>
                <input type="hidden" name="id" value={c.id} />
                <button className="text-sm text-red-600 underline">Delete</button>
              </form>
            </div>
          </div>
        ))}
        {(!churches || churches.length === 0) && (
          <p className="text-slate-500">No churches yet — click "Add Church" to create one.</p>
        )}
      </div>
    </div>
  );
}
