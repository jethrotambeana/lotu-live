const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';

// Self-contained rather than imported from lib/embed.ts — this project's
// build has broken more than once on an import that assumed a function
// existed there with a particular name/export shape that turned out to
// differ, so this small extraction logic is duplicated here rather than
// risked on an unverified assumption.
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

function extractCloudflareId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/cloudflarestream\.com\/([a-zA-Z0-9]+)/);
  return match ? match[1] : trimmed;
}

// Parses YouTube's ISO 8601 duration format (e.g. "PT15M33S", "PT1H2M10S")
// into total seconds. YouTube's contentDetails.duration is always in this
// form — no library needed for something this narrow.
function parseIso8601Duration(iso: string): number | null {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

async function fetchYouTubeDuration(videoId: string): Promise<number | null> {
  if (!YOUTUBE_API_KEY) return null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );
    if (!res.ok) return null;
    const body = await res.json();
    const iso = body.items?.[0]?.contentDetails?.duration;
    return iso ? parseIso8601Duration(iso) : null;
  } catch (err) {
    console.error(`fetchYouTubeDuration: request failed for ${videoId}:`, err);
    return null;
  }
}

async function fetchCloudflareDuration(videoUid: string): Promise<number | null> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) return null;
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${videoUid}`,
      { headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` } }
    );
    if (!res.ok) return null;
    const body = await res.json();
    const duration = body.result?.duration;
    // Cloudflare reports -1 while a video is still processing/encoding —
    // not a real duration, so treat it the same as "not available yet"
    // rather than storing a nonsense negative number.
    if (typeof duration !== 'number' || duration < 0) return null;
    return Math.round(duration);
  } catch (err) {
    console.error(`fetchCloudflareDuration: request failed for ${videoUid}:`, err);
    return null;
  }
}

// Returns null (not an error) for Cloudinary or any lookup that fails —
// callers should treat null as "unknown for now," not a hard failure.
// Cloudinary has no API integration anywhere in this project; a video on
// that provider gets its duration entered manually instead (see the
// admin video form's Duration field).
export async function lookupVideoDuration(provider: string, providerVideoId: string): Promise<number | null> {
  if (provider === 'youtube') {
    return fetchYouTubeDuration(extractYouTubeId(providerVideoId));
  }
  if (provider === 'cloudflare') {
    return fetchCloudflareDuration(extractCloudflareId(providerVideoId));
  }
  return null;
}
