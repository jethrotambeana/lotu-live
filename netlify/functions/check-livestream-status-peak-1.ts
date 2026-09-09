// Re-exports the exact same handler as check-livestream-status.ts, under
// a second scheduled trigger — see that file's top comment and
// netlify.toml for why this exists (Saturday-morning peak polling
// widened across four countries' differing timezones, split across the
// Friday/Saturday UTC boundary into two entries since cron can't express
// "Friday late hours OR Saturday early hours" as a single schedule
// without also matching Friday early hours and Saturday late hours).
//
// This half covers Friday 20:00-23:59 UTC.
export { handler } from './check-livestream-status';
