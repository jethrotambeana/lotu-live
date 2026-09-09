// Deletes a video/recording from Cloudflare Stream directly, so removing a
// video from lotu.live also removes the underlying asset rather than
// leaving it sitting on Cloudflare indefinitely. Shared between
// app/admin/videos/actions.ts and app/manage/videos/actions.ts — both are
// part of the same Next.js app bundle, unlike netlify/functions/*.ts,
// which is bundled separately and duplicates small helpers like this
// rather than importing them (see that file's own comments).
//
// Requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN — the same two
// variables already added for the recording-import feature, but that
// token was deliberately scoped to Stream:READ only (it only ever listed
// recordings). Deleting requires Stream:EDIT — go back to Cloudflare
// dashboard -> My Profile -> API Tokens and add Edit permission to the
// existing token (or create a new one and update the env var), or this
// will fail every time with an auth error.
//
// Best-effort and non-blocking by design: a Cloudflare-side failure here
// (expired token, network hiccup, wrong permission) is logged but never
// prevents the video's row from being deleted from lotu.live — the
// admin/editor's primary intent (remove this from my site) should always
// succeed regardless of what happens on Cloudflare's end.

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';

export async function deleteCloudflareRecording(videoUid: string): Promise<void> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.warn(
      `deleteCloudflareRecording: CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN not set — skipping Cloudflare-side delete for ${videoUid}.`
    );
    return;
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${videoUid}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` } }
    );
    if (!res.ok) {
      const body = await res.text();
      console.error(`deleteCloudflareRecording: Cloudflare delete failed for ${videoUid} (HTTP ${res.status}):`, body);
    }
  } catch (err) {
    console.error(`deleteCloudflareRecording: request failed for ${videoUid}:`, err);
  }
}
