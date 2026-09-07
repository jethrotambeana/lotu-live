// Formats a livestream's "when to expect this" text for display on cards
// where it isn't currently live — either a recurring weekly schedule (from
// stream_schedules) or a specific one-off upcoming date/time (from
// livestreams.start_at). Used by church/[slug] and ministry/[slug] so both
// stay consistent rather than each formatting this differently.

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatWeeklySlot(dayOfWeek: number, startTime: string): string {
  // Postgres `time` columns come back as "HH:MM:SS" strings.
  const [hourStr, minuteStr] = startTime.split(':');
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${DAY_NAMES[dayOfWeek]}s at ${hour12}:${minuteStr} ${period}`;
}

export interface ScheduleSource {
  start_at?: string | null;
  stream_schedules?: { day_of_week: number; start_time: string }[] | null;
}

export function getScheduleText(stream: ScheduleSource): string | null {
  const schedules = stream.stream_schedules ?? [];
  if (schedules.length > 0) {
    return schedules.map((s) => formatWeeklySlot(s.day_of_week, s.start_time)).join('; ');
  }
  if (stream.start_at) {
    return new Date(stream.start_at).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return null;
}
