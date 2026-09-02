import { createClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';

export default async function EventPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: event } = await supabase.from('events').select('*').eq('slug', params.slug).single();
  if (!event) return notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <span className="text-xs font-semibold uppercase text-sky-600">{event.status}</span>
      <h1 className="text-2xl font-bold">{event.name}</h1>
      <p className="text-slate-500">
        {event.venue}, {event.town} — {event.start_date} to {event.end_date}
      </p>
      {event.description && <p className="mt-4">{event.description}</p>}
      {/* livestream/video links, poster image, share controls */}
    </div>
  );
}
