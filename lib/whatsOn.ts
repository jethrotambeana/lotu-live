// Small, page-specific date helpers for the Program Guide. Deliberately
// kept separate from lib/schedule.ts, which formats a single livestream's
// own schedule into display text — this instead answers "what falls on
// this specific calendar date," aggregating across events and
// livestreams. No timezone conversion happens here, matching how every
// other date/time field on this site is already displayed: as stored,
// not adjusted per visitor — there's no precedent anywhere else in this
// project for per-user timezone handling, so this doesn't introduce it
// either.

export type GuideDay = 'today' | 'tomorrow' | 'sabbath';

export function resolveGuideDate(day: GuideDay): { isoDate: string; dayOfWeek: number; label: string } {
  const now = new Date();

  let offsetDays = 0;
  if (day === 'tomorrow') {
    offsetDays = 1;
  } else if (day === 'sabbath') {
    // 6 = Saturday. If today already IS Saturday, this resolves to 0
    // (today), not next week — "This Sabbath" means the next upcoming
    // one, including today if today qualifies.
    const todayDow = now.getDay();
    offsetDays = (6 - todayDow + 7) % 7;
  }

  const target = new Date(now);
  target.setDate(target.getDate() + offsetDays);

  const isoDate = target.toISOString().slice(0, 10);
  const dayOfWeek = target.getDay();
  const label = target.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return { isoDate, dayOfWeek, label };
}

// Formats a bare "HH:MM:SS" time value (as stored for stream_schedules /
// event start_time) into a readable "9:00 AM" — small enough not to
// warrant a library, and this exact shape of formatting isn't done
// anywhere else in the codebase yet.
export function formatTimeOfDay(time: string | null | undefined): string | null {
  if (!time) return null;
  const [hoursStr, minutesStr] = time.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function formatTimestampTimeOfDay(isoTimestamp: string | null | undefined): string | null {
  if (!isoTimestamp) return null;
  return new Date(isoTimestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
