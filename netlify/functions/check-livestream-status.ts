// Runs on a schedule (see netlify.toml) — not part of the Next.js app
// itself, so it uses @supabase/supabase-js directly with the service role
// key, bypassing RLS (there's no logged-in admin session in a cron job).
//
// Only handles provider = 'cloudflare'. Facebook and HLS have no reliable
// equivalent to Cloudflare's lifecycle endpoint, and YouTube auto-detection
// was deliberately left for a later pass — both remain fully manual.
//
// NEW: the moment a Cloudflare stream is detected going live -> offline,
// this also checks for that broadcast's finished recording and
// auto-creates a Video entry from it. Cloudflare's Live Input automatic
// recording (recording.mode) turns every session into a normal,
// standalone Stream video once it's ready — playable through the exact
// same embed/thumbnail mechanism already used for every other Cloudflare
// video in this app, so no new player logic is needed, just a new row.
//
// Requires two environment variables not previously used anywhere else in
// this project (the public lifecycle endpoint above needs neither of
// these — only LISTING a Live Input's recordings is an authenticated
// Cloudflare API v4 call):
//   CLOUDFLARE_ACCOUNT_ID   Cloudflare dashboard -> Overview page,
//                           "Account ID" in the right sidebar
//   CLOUDFLARE_API_TOKEN    Cloudflare dashboard -> My Profile -> API
//                           Tokens -> Create Token -> a custom token with
//                           Account > Stream > READ only (this feature
//                           never writes to Cloudflare, so Read is the
//                           correct minimum scope — don't grant Edit)
// If either is missing, the import step is silently skipped and the
// existing live/offline detection above keeps working exactly as before —
// this is additive, never a required dependency for the core function.
//
// KNOWN LIMITATION: import is only attempted at the exact moment a stream
// transitions to offline, not retried on later checks. Cloudflare usually
// finishes processing a recording well within the ~15-minute check
// interval for a typical service-length stream, but a very long broadcast
// could still be processing at that instant, in which case it won't be
// auto-imported. The "Convert to Video" manual action in Admin ->
// Livestreams is the intended fallback for that case.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CLOUDFLARE_CUSTOMER_CODE = process.env.NEXT_PUBLIC_CLOUDFLARE_CUSTOMER_CODE || '';
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';

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
  provider_stream_id: string;
  church_id: string | null;
  ministry_id: string | null;
  event_id: string | null;
  language: string | null;
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
      language: stream.language,
      recorded_date: rec.created ? rec.created.slice(0, 10) : null,
      // Reviewed before publishing, same as everything else that isn't
      // hand-created directly by an admin — confirms the title reads
      // well, the auto-thumbnail isn't an awkward frame, and it's
      // actually worth publishing before it goes public.
      approved: false,
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
    .select('id, name, provider_stream_id, status, church_id, ministry_id, event_id, language')
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
        await supabase.from('livestreams').update({ status: 'live' }).eq('id', stream.id);
        updated++;
      } else if (!isLive && stream.status === 'live') {
        await supabase.from('livestreams').update({ status: 'offline' }).eq('id', stream.id);
        updated++;

        // This transition — just went from live to offline — is exactly
        // the moment a freshly-finished recording becomes available.
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
