import { createClient } from '@/lib/supabaseServer';
import LiveCard from '@/components/LiveCard';

export default async function LiveDirectoryPage({
  searchParams,
}: {
  searchParams: { country?: string; type?: string; status?: string; language?: string };
}) {
  const supabase = createClient();
  let query = supabase.from('livestreams').select('slug, name, location, status, preview_image').eq('visible', true);

  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.language) query = query.eq('language', searchParams.language);
  // country/type filters would join countries/categories by id in a full implementation

  const { data: streams } = await query.limit(50);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Watch Live</h1>
      {/* Filter bar: country, content type, status, language selects go here,
          each reading/writing the corresponding searchParams key */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {(streams ?? []).map((s) => (
          <LiveCard key={s.slug} {...s} status={s.status as any} />
        ))}
      </div>
    </div>
  );
}
