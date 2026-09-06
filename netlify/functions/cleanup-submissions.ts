// Runs daily (see netlify.toml) — deletes approved/rejected submissions
// (across all three submission tables) once they're more than 60 days
// past their review date (updated_at, stamped the moment Approve/Reject
// is clicked — not the original submission date). Pending submissions are
// never touched regardless of age; they always need a human decision.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const RETENTION_DAYS = 60;

export async function handler() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('cleanup-submissions: missing required environment variables, skipping run.');
    return { statusCode: 500, body: 'Missing environment variables' };
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const tables = ['submissions', 'event_submissions', 'ministry_submissions'] as const;
  const results: Record<string, number> = {};

  for (const table of tables) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .in('status', ['approved', 'rejected'])
      .lt('updated_at', cutoff);

    if (error) {
      console.error(`cleanup-submissions: failed to clean up ${table}:`, error);
    } else {
      results[table] = count ?? 0;
    }
  }

  console.log('cleanup-submissions: deleted', results);
  return { statusCode: 200, body: JSON.stringify(results) };
}
