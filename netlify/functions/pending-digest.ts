// Runs daily (see netlify.toml) — sends every admin account a digest email
// summarizing everything currently waiting on manual review: new public
// submissions (Church/Event/Ministry), pending editor activations, and
// editor-submitted Events/Videos awaiting re-approval. Deliberately skipped
// entirely (no email sent at all) on days where nothing is pending, so
// admins aren't trained to tune the email out.
//
// Uses the service role key to read across tables/roles that RLS would
// otherwise scope down for a normal session — same pattern as
// check-livestream-status.ts and cleanup-submissions.ts, and never used
// outside this file.
//
// Recipients are every profiles row with role = 'admin', using
// profiles.email — the same field grantChurchEditor/grantMinistryEditor
// already trust elsewhere. Per the project's existing note on that column
// (synced at signup only, not kept in sync afterward), an admin who
// changes their email elsewhere won't receive this until that's updated
// directly in profiles.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'LOTU.LIVE <noreply@updates.lotu.live>';
const SITE_URL = 'https://lotu.live';

async function sendDigestEmail(to: string, subject: string, text: string) {
  if (!RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY not set — skipping pending-items digest to ${to}`);
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, text }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Failed to send pending-items digest to ${to}:`, res.status, body);
    }
  } catch (err) {
    // Non-fatal by design, same as lib/email.ts — a failed notification
    // should never fail the whole scheduled run.
    console.error(`Pending-items digest send error for ${to}:`, err);
  }
}

export async function handler() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('pending-digest: missing required environment variables, skipping run.');
    return { statusCode: 500, body: 'Missing environment variables' };
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const [
    { count: churchSubs },
    { count: eventSubs },
    { count: ministrySubs },
    { count: pendingEditors },
    { count: pendingEvents },
    { count: pendingVideos },
  ] = await Promise.all([
    supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('event_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('ministry_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'pending_editor'),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('approved', false),
    supabase.from('videos').select('*', { count: 'exact', head: true }).eq('approved', false),
  ]);

  const submissionsTotal = (churchSubs ?? 0) + (eventSubs ?? 0) + (ministrySubs ?? 0);
  const total = submissionsTotal + (pendingEditors ?? 0) + (pendingEvents ?? 0) + (pendingVideos ?? 0);

  if (total === 0) {
    console.log('pending-digest: nothing pending, skipping email.');
    return { statusCode: 200, body: 'Nothing pending' };
  }

  const lines: string[] = [];
  if (submissionsTotal > 0) {
    lines.push(
      `${submissionsTotal} new submission${submissionsTotal === 1 ? '' : 's'} awaiting review (${
        churchSubs ?? 0
      } church, ${eventSubs ?? 0} event, ${ministrySubs ?? 0} ministry) — ${SITE_URL}/admin/submissions`
    );
  }
  if ((pendingEditors ?? 0) > 0) {
    lines.push(
      `${pendingEditors} editor activation${pendingEditors === 1 ? '' : 's'} awaiting approval — ${SITE_URL}/admin/submissions`
    );
  }
  if ((pendingEvents ?? 0) > 0) {
    lines.push(`${pendingEvents} event${pendingEvents === 1 ? '' : 's'} awaiting re-approval — ${SITE_URL}/admin/events`);
  }
  if ((pendingVideos ?? 0) > 0) {
    lines.push(`${pendingVideos} video${pendingVideos === 1 ? '' : 's'} awaiting re-approval — ${SITE_URL}/admin/videos`);
  }

  const subject = `LOTU.LIVE: ${total} item${total === 1 ? '' : 's'} awaiting your review`;
  const text = `Good morning,

The following items on LOTU.LIVE are waiting on your review:

${lines.map((l) => `- ${l}`).join('\n')}

— The LOTU.LIVE Team`;

  const { data: admins, error } = await supabase.from('profiles').select('email').eq('role', 'admin');
  if (error) {
    console.error('pending-digest: failed to look up admin accounts:', error);
    return { statusCode: 500, body: 'Failed to look up admin accounts' };
  }

  const recipients = (admins ?? []).map((a: any) => a.email).filter(Boolean);
  if (recipients.length === 0) {
    console.warn('pending-digest: no admin accounts with an email on file — nothing sent.');
    return { statusCode: 200, body: 'No admin recipients' };
  }

  await Promise.all(recipients.map((email: string) => sendDigestEmail(email, subject, text)));

  console.log(`pending-digest: sent to ${recipients.length} admin(s).`, { total });
  return { statusCode: 200, body: JSON.stringify({ total, recipients: recipients.length }) };
}
