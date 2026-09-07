import { createClient } from '@/lib/supabaseServer';
import { addCategory, renameCategory, deleteCategory } from './actions';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, video_categories(count)')
    .order('name');

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Categories</h1>
      <p className="mb-6 text-sm text-slate-500">
        These are the tags available when adding or editing a video (Admin → Videos → Category
        checkboxes). Deleting a category untags it from any videos that had it — it doesn't delete
        those videos.
      </p>

      {searchParams.error && (
        <div className="mb-4 max-w-xl rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}

      <form action={addCategory} className="mb-6 flex max-w-md gap-2">
        <input
          name="name"
          placeholder="New category name"
          required
          className="flex-1 rounded border border-slate-300 p-2 text-sm"
        />
        <button className="rounded bg-sky-600 px-4 py-2 text-sm text-white whitespace-nowrap">
          + Add Category
        </button>
      </form>

      <div className="max-w-md space-y-2">
        {(categories ?? []).map((c: any) => {
          const count = c.video_categories?.[0]?.count ?? 0;
          return (
            <div key={c.id} className="flex items-center gap-2 rounded border border-slate-200 p-2">
              <form action={renameCategory} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input
                  name="name"
                  defaultValue={c.name}
                  className="flex-1 rounded border border-slate-300 p-1.5 text-sm"
                />
                <button className="text-sm text-sky-600 underline whitespace-nowrap">Save</button>
              </form>
              <span className="shrink-0 text-xs text-slate-400">
                {count} video{count === 1 ? '' : 's'}
              </span>
              <form action={deleteCategory}>
                <input type="hidden" name="id" value={c.id} />
                <ConfirmSubmitButton
                  confirmMessage={`Delete "${c.name}"? This untags it from ${count} video${count === 1 ? '' : 's'} but doesn't delete them.`}
                  className="shrink-0 text-sm text-red-600 underline"
                >
                  Delete
                </ConfirmSubmitButton>
              </form>
            </div>
          );
        })}
        {(!categories || categories.length === 0) && (
          <p className="text-slate-500">No categories yet — add one above.</p>
        )}
      </div>
    </div>
  );
}
