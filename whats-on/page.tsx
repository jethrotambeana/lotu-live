import Link from 'next/link';
import { createClient } from '@/lib/supabaseServer';
import { resolveGuideDate, formatTimeOfDay, formatTimestampTimeOfDay, GuideDay } from '@/lib/whatsOn';

const TABS: { value: GuideDay; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'sabbath', label: 'This Sabbath' },
];

interface GuideEntry {
  time: string | null; // for sorting/display — "9:00 AM" or null if unscheduled
  sortKey: string; // "09:00" 24h for correct chronological sort; unscheduled sorts last
  title: string;
  subtitle: string;
  href: string;
  kind: 'live' | 'stream' | 'event';
}

export default async function WhatsOnPage({ searchParams }: { searchParams: { day?: string } }) {
  const day: GuideDay = searchParams.day === 'tomorrow' || searchParams.day === 'sabbath' ? searchParams.day : 'today';
  const { isoDate, dayOfWeek, label } = resolveGuideDate(day);

  const supabase = createClient();
  const entries: GuideEntry[] = [];

  // Events happening on this date — covers both single-day events
  // (start_date = isoDate) and multi-day ones spanning across it.
  const { data: events } = await supabase
    .from('events')
    .select('slug, name, venue, town, start_date, end_date, start_time, churches(name), ministries(name)')
    .lte('start_date', isoDate)
    .or(`end_date.gte.${isoDate},and(end_date.is.null,start_date.eq.${isoDate})`);

  for (const e of events ?? []) {
    const host = (e as any).churches?.name || (e as any).ministries?.name;
    entries.push({
      time: formatTimeOfDay(e.start_time),
      sortKey: e.start_time ?? '99:99',
      title: e.name,
      subtitle: [host, e.venue, e.town].filter(Boolean).join(' · ') || 'Event',
      href: `/event/${e.slug}`,
      kind: 'event',
    });
  }

  // Recurring weekly livestream schedules matching this day of week.
  // !inner filters the embedded stream_schedules rows down to only ones
  // matching dayOfWeek, rather than returning every schedule slot the
  // stream has.
  const { data: recurring } = await supabase
    .from('livestreams')
    .select('slug, name, status, churches(name), ministries(name), stream_schedules!inner(day_of_week, start_time)')
    .eq('visible', true)
    .eq('is_continuous', false)
    .eq('stream_schedules.day_of_week', dayOfWeek);

  for (const s of recurring ?? []) {
    const host = (s as any).churches?.name || (s as any).ministries?.name;
    for (const slot of (s as any).stream_schedules ?? []) {
      entries.push({
        time: formatTimeOfDay(slot.start_time),
        sortKey: slot.start_time ?? '99:99',
        title: s.name,
        subtitle: host || 'Livestream',
        href: `/watch/${s.slug}`,
        kind: s.status === 'live' ? 'live' : 'stream',
      });
    }
  }

  // One-off scheduled streams (a specific start_at on this date, not part
  // of a recurring weekly slot) — e.g. a special broadcast.
  const { data: oneOff } = await supabase
    .from('livestreams')
    .select('slug, name, status, start_at, churches(name), ministries(name)')
    .eq('visible', true)
    .eq('is_continuous', false)
    .gte('start_at', `${isoDate}T00:00:00`)
    .lt('start_at', `${isoDate}T23:59:59`);

  for (const s of oneOff ?? []) {
    // Skip if this stream already showed up via a recurring schedule
    // match above, so a special one-off broadcast on a day that also has
    // a regular slot doesn't get listed twice.
    if ((recurring ?? []).some((r) => r.slug === s.slug)) continue;
    const host = (s as any).churches?.name || (s as any).ministries?.name;
    entries.push({
      time: formatTimestampTimeOfDay(s.start_at),
      sortKey: new Date(s.start_at).toISOString().slice(11, 16),
      title: s.name,
      subtitle: host || 'Livestream',
      href: `/watch/${s.slug}`,
      kind: s.status === 'live' ? 'live' : 'stream',
    });
  }

  // Currently-live streams, today only — catches anything genuinely live
  // right now that isn't already represented above (e.g. an
  // unscheduled/ad-hoc broadcast).
  if (day === 'today') {
    const { data: liveNow } = await supabase
      .from('livestreams')
      .select('slug, name, churches(name), ministries(name)')
      .eq('visible', true)
      .eq('status', 'live');

    for (const s of liveNow ?? []) {
      if (entries.some((e) => e.href === `/watch/${s.slug}`)) continue;
      const host = (s as any).churches?.name || (s as any).ministries?.name;
      entries.push({
        time: null,
        sortKey: '00:00', // live-right-now sorts first
        title: s.name,
        subtitle: host || 'Livestream',
        href: `/watch/${s.slug}`,
        kind: 'live',
      });
    }
  }

  entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">What's On</h1>
      <p className="mb-6 text-slate-500">{label}</p>

      <div className="mb-6 flex gap-2 border-b border-slate-200">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/whats-on?day=${tab.value}`}
            className={`px-4 py-2 text-sm font-medium ${
              day === tab.value
                ? 'border-b-2 border-sky-600 text-sky-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {entries.length === 0 && (
        <p className="text-slate-500">Nothing scheduled for {label.split(',')[0]} yet — check back soon.</p>
      )}

      <div className="space-y-2">
        {entries.map((entry, i) => (
          <Link
            key={i}
            href={entry.href}
            className="flex items-center gap-4 rounded border border-slate-200 p-3 hover:bg-slate-50"
          >
            <div className="w-20 shrink-0 text-sm font-medium text-slate-600">
              {entry.kind === 'live' ? (
                <span className="flex items-center gap-1.5 text-red-600">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
                  </span>
                  LIVE
                </span>
              ) : (
                entry.time || '—'
              )}
            </div>
            <div>
              <p className="font-medium">{entry.title}</p>
              <p className="text-sm text-slate-500">{entry.subtitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
