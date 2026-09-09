// Runs once daily (see netlify.toml) — the mirror image of
// lib/cloudflareStream.ts's deleteCloudflareRecording (which deletes from
// Cloudflare when a video is deleted on lotu.live). This handles the
// opposite direction: someone deletes a recording directly in the
// Cloudflare dashboard, with no idea lotu.live even exists — Cloudflare
// has no webhook for this, so the only way to notice is to periodically
// ask "does this still exist?" for every Cloudflare-sourced video and
// clean up any that come back not-found. Deliberately a separate, once-
// daily function rather than folded into check-livestream-status.ts's
// 15-minute cycle — unlike live/offline detection, this isn't
// time-sensitive, and checking every Cloudflare video that many times a
// day would be needless API traffic for no real benefit.
//
// Deletes the row entirely (not just unapprove/hide) — a recording that
// no longer exists on Cloudflare can never play again regardless, so
// keeping a permanently-broken entry around serves no purpose. This was
// an explicit choice, not a default; if a "keep for review" middle ground
// is ever wanted instead, this is the file to change.
//
// Uses the same CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN already set
// up for the recording-import and delete-sync features — no new
// credentials needed.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';

// Returns true if the video still exists on Cloudflare, false if
// Cloudflare confirms it's gone (404 / success:false), or null if the
// check itself failed (network error, rate limit, etc.) — null means
// "unknown," and callers should NOT delete on an unknown result, only on
// a confirmed absence.
async function cloudflareVideoExists(uid: string): Promise<boolean | null> {
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${uid}`, {
      headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
    });

    if (res.status === 404) return false;
    if (!res.ok) {
      console.warn(`sync-cloudflare-videos: unexpected status ${res.status} checking ${uid} — leaving it alone.`);
      return null;
    }

    const body = await res.json();
    if (body.success === false) return false;
    return true;
  } catch (err) {
    console.error(`sync-cloudflare-videos: request failed checking ${uid}:`, err);
    return null;
  }
}

export async function handler() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('sync-cloudflare-videos: missing required environment variables, skipping run.');
    return { statusCode: 500, body: 'Missing environment variables' };
  }

  const supabase: SupabaseClient<any> = createClient<any>(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, title, provider_video_id')
    .eq('provider', 'cloudflare');

  if (error) {
    console.error('sync-cloudflare-videos: failed to fetch videos:', error);
    return { statusCode: 500, body: 'Failed to fetch videos' };
  }

  let checked = 0;
  let deleted = 0;

  for (const video of videos ?? []) {
    if (!video.provider_video_id) continue;
    checked++;

    const exists = await cloudflareVideoExists(video.provider_video_id);
    if (exists === false) {
      // video_categories has `on delete cascade` on video_id, so no
      // manual cleanup needed there — same as the app's own deleteVideo.
      const { error: deleteError } = await supabase.from('videos').delete().eq('id', video.id);
      if (deleteError) {
        console.error(`sync-cloudflare-videos: failed to delete orphaned video ${video.id}:`, deleteError);
      } else {
        deleted++;
        console.log(`sync-cloudflare-videos: deleted "${video.title}" (${video.id}) — no longer exists on Cloudflare.`);
      }
    }
    // exists === true or null: leave it alone, nothing to do.
  }

  console.log(`sync-cloudflare-videos: checked ${checked} video(s), deleted ${deleted}.`);
  return { statusCode: 200, body: `Checked ${checked}, deleted ${deleted}` };
}
