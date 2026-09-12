// Runs every 10 minutes (see netlify.toml) — not part of the Next.js app
// itself, so it uses @supabase/supabase-js directly with the service role
// key, bypassing RLS (there's no logged-in admin session in a cron job).
//
// check-livestream-status-peak-1.ts and check-livestream-status-peak-2.ts
// are thin wrappers that re-export this exact same handler under two
// additional scheduled triggers, running every 5 minutes during a
// Saturday-morning window widened to roughly cover Vanuatu/Solomon
// Islands/PNG/Fiji's differing local mornings at once — see netlify.toml
// for the actual UTC math and why it's split into two entries. Running
// more often during that window is safe: every check here is idempotent
// (dedup on provider_video_id, and only flips status on a genuine
// transition), so overlapping with the base 10-minute schedule just means
// a few redundant checks, never duplicate data.
//
// Only handles provider = 'cloudflare'. Facebook and HLS have no reliable
// equivalent to Cloudflare's lifecycle endpoint, and YouTube auto-detection
// was deliberately left for a later pass — both remain fully manual.
//
// Whenever a Cloudflare stream is currently offline, this also checks for
// finished recordings and auto-creates a Video entry from any not already
// imported — approved immediately, going straight to the public site with
// no review step. This is deliberate: since the underlying livestream
// itself was already fully set up by an admin (provider, credentials,
// church/ministry/event linkage), the resulting recording is treated as
// trusted content, unlike a video added through any OTHER path (the
// admin/editor video forms, YouTube, Cloudinary, etc.), which keeps its
// own existing approval rules untouched by this file. Cloudflare's Live
// Input automatic recording (recording.mode) turns every session into a
// normal, standalone Stream video once it's ready — playable through the
// exact same embed/thumbnail mechanism already used for every other
// Cloudflare video in this app, so no new player logic is needed, just a
// new row.
//
// IMPORTANT: import is checked on EVERY run for EVERY currently-offline
// Cloudflare stream, not just the exact moment a stream transitions to
// offline. Earlier versions of this file only checked on that single
// transition edge — but a recording that's still processing at that exact
// instant (Cloudflare's status stays "inprogress" until encoding
// finishes) would then never be retried, since the code had no memory of
// "still waiting on this one," only "did the live/offline status just
// change." Rechecking every run instead makes this self-healing: a slow
// recording just gets picked up on a later cycle once it's actually
// ready. The dedup check inside importFinishedRecordings (matching on
// provider_video_id) makes this safe to call repeatedly — nothing gets
// imported twice, so the only real cost of checking more often is one
// extra lightweight Cloudflare API call per offline stream per run,
// which is trivial at this platform's scale.
//
// Requires two environment variables not previously used anywhere else in
// this project (the public lifecycle endpoint above needs neither of
// these — only LISTING a Live Input's recordings is an authenticated
// Cloudflare API v4 call):
//   CLOUDFLARE_ACCOUNT_ID   Cloudflare dashboard -> Overview page,
//                           "Account ID" in the right sidebar
//   CLOUDFLARE_API_TOKEN    Cloudflare dashboard -> My Profile -> API
//                           Tokens -> a custom token with Account >
//                           Stream > EDIT (Edit, not just Read — Edit is
//                           also required separately for the
//                           delete-from-Cloudflare feature in
//                           lib/cloudflareStream.ts, which shares this
//                           same token)
// If either is missing, the import step is silently skipped and the
// existing live/offline detection above keeps working exactly as before —
// this is additive, never a required dependency for the core function.
//
// Also sends a "you're followed church just went live" email to every
// follower on the same live transition, using the existing
// RESEND_API_KEY/EMAIL_FROM_ADDRESS already set up for every other
// transactional email in this project — see notifyFollowers below. Same
// non-blocking philosophy: if RESEND_API_KEY is missing, this is silently
// skipped.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CLOUDFLARE_CUSTOMER_CODE = process.env.NEXT_PUBLIC_CLOUDFLARE_CUSTOMER_CODE || '';
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'LOTU.LIVE <noreply@updates.lotu.live>';

// Duplicated from lib/email.ts rather than imported — same reason as
// extractCloudflareId above: this function is bundled independently of
// the Next.js app, and reaching into app/lib code isn't reliable across
// that boundary (pending-digest.ts does the same thing for its own
// emails).
async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!RESEND_API_KEY) return;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: EMAIL_FROM_ADDRESS, to, subject, text }),
    });
    if (!res.ok) {
      console.error(`sendEmail: Resend API failed for ${to} (HTTP ${res.status}):`, await res.text());
    }
  } catch (err) {
    console.error(`sendEmail: request failed for ${to}:`, err);
  }
}

// Emails everyone following this stream's church/ministry that it just
// went live. Best-effort and non-blocking, same as importFinishedRecordings
// below — a failure here (missing Resend key, a bad email address, a
// network hiccup) is logged and swallowed, never allowed to affect the
// live/offline status check itself.
//
// follows.user_id references auth.users(id), not profiles(id) directly,
// so there's no FK relationship PostgREST can auto-join across those two
// tables — this deliberately fetches user_id first, then looks up emails
// from profiles separately, rather than attempting a one-step embedded
// select that would silently return nothing.
async function notifyFollowers(supabase: SupabaseClient<any>, stream: StreamRow) {
  if (!RESEND_API_KEY) return;
  if (stream.is_continuous) return; // 24/7 channel — "just went live" isn't a meaningful signal, see sql migration comments
  if (!stream.church_id && !stream.ministry_id) return;

  const filter = stream.church_id ? `church_id.eq.${stream.church_id}` : `ministry_id.eq.${stream.ministry_id}`;
  const { data: followRows, error: followError } = await supabase.from('follows').select('user_id').or(filter);

  if (followError) {
    console.error(`notifyFollowers: failed to fetch followers for stream ${stream.id}:`, followError);
    return;
  }
  const userIds = (followRows ?? []).map((f: any) => f.user_id);
  if (userIds.length === 0) return;

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .in('id', userIds);

  if (profileError) {
    console.error(`notifyFollowers: failed to fetch follower emails for stream ${stream.id}:`, profileError);
    return;
  }

  const emails = (profiles ?? []).map((p: any) => p.email).filter(Boolean);
  if (emails.length === 0) return;

  const subject = `${stream.name} is live now on LOTU.LIVE`;
  const text = `Good news — ${stream.name} just went live.

Watch now: https://lotu.live/watch/${stream.slug}

You're receiving this because you follow ${stream.name} on LOTU.LIVE. Manage what you follow anytime at https://lotu.live/following

— The LOTU.LIVE Team`;

  await Promise.all(emails.map((email: string) => sendEmail(email, subject, text)));
  console.log(`notifyFollowers: emailed ${emails.length} follower(s) for stream ${stream.id}.`);
}

// Mirrors lib/embed.ts's extractCloudflareId. Duplicated (not imported)
// because this function is bundled independently of the Next.js app by
// Netlify, and reaching across into app/lib code isn't reliable across
// that bundling boundary.
function extractCloudflareId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/cloudflarestream\.com\/([a-zA-Z0-9]+)/);
  return match ? match[1] : trimmed;
}

function deriveCloudflareThumbnail(uid: string): string {
  return `https://customer-${CLOUDFLARE_CUSTOMER_CODE}.cloudflarestream.com/${uid}/thumbnails/thumbnail.jpg`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formatSessionTitle(streamName: string, isoDate: string | undefined): string {
  if (!isoDate) return streamName;
  const formatted = new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${streamName} — ${formatted}`;
}

interface StreamRow {
  id: string;
  name: string;
  slug: string;
  provider_stream_id: string;
  church_id: string | null;
  ministry_id: string | null;
  event_id: string | null;
  language: string | null;
  is_continuous: boolean;
}

// Looks up finished recordings for a Live Input and creates a Video row
// for any not already imported. Best-effort: any failure here is logged
// and swallowed, never allowed to affect the live/offline status check,
// which is this function's primary job and must keep working even if
// this secondary feature's credentials are missing, wrong, or rate-limited.
//
// `SupabaseClient<any>` (not the bare inferred type) is deliberate — this
// project has no generated Database type, and without an explicit `any`
// here, `.insert()` on an untyped client resolves its expected argument
// type to `never[]` and fails the build with a TypeScript error, even
// though the actual object being inserted is perfectly valid at runtime.
async function importFinishedRecordings(supabase: SupabaseClient<any>, stream: StreamRow) {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) return; // feature not configured — skip silently

  const inputId = extractCloudflareId(stream.provider_stream_id);

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/live_inputs/${inputId}/videos`,
    { headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` } }
  );

  if (!res.ok) {
    console.warn(`check-livestream-status: recordings lookup failed for ${stream.id} (HTTP ${res.status})`);
    return;
  }

  const body = await res.json();
  const recordings = (body.result ?? []).filter((v: any) => v.status?.state === 'ready');

  for (const rec of recordings) {
    const { data: existing } = await supabase
      .from('videos')
      .select('id')
      .eq('provider', 'cloudflare')
      .eq('provider_video_id', rec.uid)
      .maybeSingle();
    if (existing) continue; // already imported this session — dedup

    const { error: insertError } = await supabase.from('videos').insert({
      title: formatSessionTitle(stream.name, rec.created),
      slug: `${slugify(stream.name)}-${rec.uid.slice(0, 6)}`,
      church_id: stream.church_id,
      ministry_id: stream.ministry_id,
      event_id: stream.event_id,
      provider: 'cloudflare',
      provider_video_id: rec.uid,
      thumbnail: rec.thumbnail || deriveCloudflareThumbnail(rec.uid),
      // Cloudflare's recordings-list response already includes duration
      // per item (same video-resource shape as the single-video GET
      // endpoint used elsewhere) — no extra API call needed. -1 means
      // still processing, same "not available yet" handling used in
      // lib/videoDuration.ts.
      duration_seconds: typeof rec.duration === 'number' && rec.duration >= 0 ? Math.round(rec.duration) : null,
      language: stream.language,
      recorded_date: rec.created ? rec.created.slice(0, 10) : null,
      // Goes straight to the public site — see the top-of-file comment
      // for why this differs from every other video-creation path.
      approved: true,
    });

    if (insertError) {
      console.error(`check-livestream-status: failed to import recording ${rec.uid}:`, insertError);
    } else {
      console.log(`check-livestream-status: imported recording ${rec.uid} as a new video for stream ${stream.id}.`);
    }
  }
}

export async function handler() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !CLOUDFLARE_CUSTOMER_CODE) {
    console.error('check-livestream-status: missing required environment variables, skipping run.');
    return { statusCode: 500, body: 'Missing environment variables' };
  }

  const supabase = createClient<any>(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: streams, error } = await supabase
    .from('livestreams')
    .select(
      'id, name, slug, provider_stream_id, status, church_id, ministry_id, event_id, language, is_continuous'
    )
    .eq('provider', 'cloudflare');

  if (error) {
    console.error('check-livestream-status: failed to fetch livestreams:', error);
    return { statusCode: 500, body: 'Failed to fetch livestreams' };
  }

  let checked = 0;
  let updated = 0;

  for (const stream of streams ?? []) {
    checked++;
    try {
      const inputId = extractCloudflareId(stream.provider_stream_id);
      const res = await fetch(
        `https://customer-${CLOUDFLARE_CUSTOMER_CODE}.cloudflarestream.com/${inputId}/lifecycle`
      );

      if (!res.ok) {
        console.warn(`check-livestream-status: lifecycle check failed for ${stream.id} (HTTP ${res.status})`);
        continue;
      }

      const body = await res.json();
      const isLive = body.live === true;

      // Only flip live <-> offline automatically. Deliberately leaves
      // 'upcoming' and 'scheduled' alone unless the stream actually starts
      // broadcasting, so this never clobbers an admin's future scheduling
      // — it only takes over once a stream is genuinely live or has
      // stopped being live.
      if (isLive && stream.status !== 'live') {
        await supabase
          .from('livestreams')
          .update({ status: 'live', last_live_at: new Date().toISOString() })
          .eq('id', stream.id);
        updated++;

        try {
          await notifyFollowers(supabase, stream as StreamRow);
        } catch (notifyErr) {
          console.error(`check-livestream-status: follower notification failed for ${stream.id}:`, notifyErr);
        }
      } else if (!isLive) {
        if (stream.status === 'live') {
          await supabase.from('livestreams').update({ status: 'offline' }).eq('id', stream.id);
          updated++;
        }

        // Checked every run while offline, not just on the transition
        // edge — see the top-of-file note on why. Cheap and safe to
        // repeat thanks to the dedup check inside.
        try {
          await importFinishedRecordings(supabase, stream as StreamRow);
        } catch (importErr) {
          console.error(`check-livestream-status: recording import failed for ${stream.id}:`, importErr);
        }
      }
    } catch (err) {
      console.error(`check-livestream-status: error checking stream ${stream.id}:`, err);
    }
  }

  console.log(`check-livestream-status: checked ${checked} stream(s), updated ${updated}.`);
  return { statusCode: 200, body: `Checked ${checked}, updated ${updated}` };
}
