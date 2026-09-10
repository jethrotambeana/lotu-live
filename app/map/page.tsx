import { createClient } from '@/lib/supabaseServer';
import PacificMapLoader from '@/components/PacificMapLoader';

export const metadata = {
  title: 'Map — LOTU.LIVE',
  description: 'Find Seventh-day Adventist churches across the Pacific on a map.',
};

export default async function MapPage() {
  const supabase = createClient();

  // Only churches with coordinates actually set show a pin — this is a
  // gradual rollout (see sql migration comments), not every church will
  // have this filled in yet.
  const { data: churches } = await supabase
    .from('churches')
    .select('slug, name, town, latitude, longitude')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  const mapChurches = (churches ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
    town: c.town,
    latitude: c.latitude as number,
    longitude: c.longitude as number,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Church Map</h1>
      <p className="mb-6 text-slate-500">
        {mapChurches.length > 0
          ? `${mapChurches.length} church${mapChurches.length === 1 ? '' : 'es'} plotted so far — tap a pin to visit its page.`
          : 'No churches have coordinates set yet — check back soon.'}
      </p>
      <PacificMapLoader churches={mapChurches} />
    </div>
  );
}
