// Runs on a schedule (see netlify.toml) — the YouTube counterpart to
// check-livestream-status.ts, which only ever handled Cloudflare. Uses
// @supabase/supabase-js directly with the service role key, same reason
// as that file: no logged-in session exists in a scheduled job.
//
// YouTube's videos.list endpoint exposes snippet.liveBroadcastContent
// ("live" / "upcoming" / "none") for any video ID, using just an API key
// — no OAuth needed, since this only reads public broadcast status, not
// anything account-specific. That's simpler than it might sound, which
// is why this exists now rather than being left permanently manual.
//
// Deliberately does NOT attempt a Cloudflare-style "import the finished
// recording as a Video" step: a YouTube livestream keeps the exact same
// video ID as a normal replay once it ends (YouTube does this itself,
// automatically) — there's no separate recording asset to fetch. The
// existing "Convert to Video" button in Admin -> Livestreams already
// covers turning that same ID into a Video entry when wanted.
//
// Facebook remains fully manual, not handled here either — its Graph API
// requires a Page Access Token and app review for this kind of status
// check, unlike YouTube's simple API-key-only read.
//
// Requires ONE new environment variable:
//   YOUTUBE_API_KEY   Google Cloud Console -> a project with "YouTube
//                     Data API v3" enabled -> Credentials -> Create
//                     Credentials -> API Key. No OAuth consent screen or
//                     account linking needed for this read-only use.
// If missing, this function logs an error and does nothing — it never
// touches livestreams' status, so leaving it unset simply means YouTube
// stays exactly as manual as it's always been.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'LOTU.LIVE <noreply@updates.lotu.live>';

// Mirrors lib/embed.ts's YouTube ID extraction logic. Duplicated, not
// imported — this function is bundled independently of the Next.js app,
// same reasoning as check-livestream-status.ts's own duplicated helpers.
// Handles a bare 11-character ID, or watch/live/embed/youtu.be URL forms.
function extractYouTubeId(input: string): string {
  const trimmed = input.trim();
  const patterns = [
    /(?:youtube\.com\/(?:watch\?v=|live\/|embed\/))([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return trimmed;
}

// Duplicated from lib/email.ts rather than imported, same as
// check-livestream-status.ts's own copy.
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

interface StreamRow {
  id: string;
  name: string;
  slug: string;
  provider_stream_id: string;
  church_id: string | null;
  ministry_id: string | null;
  is_continuous: boolean;
}

async function notifyFollowers(supabase: SupabaseClient<any>, stream: StreamRow) {
  if (!RESEND_API_KEY || stream.is_continuous) return;
  if (!stream.church_id && !stream.ministry_id) return;

  const filter = stream.church_id ? `church_id.eq.${stream.church_id}` : `ministry_id.eq.${stream.ministry_id}`;
  const { data: followRows } = await supabase.from('follows').select('user_id').or(filter);
  const userIds = (followRows ?? []).map((f: any) => f.user_id);
  if (userIds.length === 0) return;

  const { data: profiles } = await supabase.from('profiles').select('email').in('id', userIds);
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

export async function handler() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('check-youtube-status: missing required Supabase environment variables, skipping run.');
    return { statusCode: 500, body: 'Missing environment variables' };
  }
  if (!YOUTUBE_API_KEY) {
    console.error('check-youtube-status: YOUTUBE_API_KEY not set, skipping run.');
    return { statusCode: 200, body: 'YouTube detection not configured' };
  }

  const supabase = createClient<any>(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: streams, error } = await supabase
    .from('livestreams')
    .select('id, name, slug, provider_stream_id, status, church_id, ministry_id, is_continuous')
    .eq('provider', 'youtube');

  if (error) {
    console.error('check-youtube-status: failed to fetch livestreams:', error);
    return { statusCode: 500, body: 'Failed to fetch livestreams' };
  }

  let checked = 0;
  let updated = 0;

  for (const stream of streams ?? []) {
    checked++;
    try {
      const videoId = extractYouTubeId(stream.provider_stream_id);
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
      );

      if (!res.ok) {
        console.warn(`check-youtube-status: API call failed for ${stream.id} (HTTP ${res.status})`);
        continue;
      }

      const body = await res.json();
      const liveBroadcastContent = body.items?.[0]?.snippet?.liveBroadcastContent;
      // Video not found, private, or deleted — nothing sensible to do,
      // leave its status untouched rather than guessing.
      if (!liveBroadcastContent) continue;

      const isLive = liveBroadcastContent === 'live';

      // Same transition-only logic as the Cloudflare version — only
      // flips live <-> offline, never touches 'upcoming'/'scheduled'
      // unless the video is genuinely broadcasting.
      if (isLive && stream.status !== 'live') {
        await supabase
          .from('livestreams')
          .update({ status: 'live', last_live_at: new Date().toISOString() })
          .eq('id', stream.id);
        updated++;

        try {
          await notifyFollowers(supabase, stream as StreamRow);
        } catch (notifyErr) {
          console.error(`check-youtube-status: follower notification failed for ${stream.id}:`, notifyErr);
        }
      } else if (!isLive && stream.status === 'live') {
        await supabase.from('livestreams').update({ status: 'offline' }).eq('id', stream.id);
        updated++;
      }
    } catch (err) {
      console.error(`check-youtube-status: error checking stream ${stream.id}:`, err);
    }
  }

  console.log(`check-youtube-status: checked ${checked} stream(s), updated ${updated}.`);
  return { statusCode: 200, body: `Checked ${checked}, updated ${updated}` };
}
