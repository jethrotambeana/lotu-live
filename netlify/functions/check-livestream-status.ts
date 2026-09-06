// Runs on a schedule (see netlify.toml) — not part of the Next.js app
// itself, so it uses @supabase/supabase-js directly with the service role
// key, bypassing RLS (there's no logged-in admin session in a cron job).
//
// Only handles provider = 'cloudflare'. Facebook and HLS have no reliable
// equivalent to Cloudflare's lifecycle endpoint, and YouTube auto-detection
// was deliberately left for a later pass — both remain fully manual.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CLOUDFLARE_CUSTOMER_CODE = process.env.NEXT_PUBLIC_CLOUDFLARE_CUSTOMER_CODE || '';

// Mirrors lib/embed.ts's extractCloudflareId. Duplicated (not imported)
// because this function is bundled independently of the Next.js app by
// Netlify, and reaching across into app/lib code isn't reliable across
// that bundling boundary.
function extractCloudflareId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/cloudflarestream\.com\/([a-zA-Z0-9]+)/);
  return match ? match[1] : trimmed;
}

export async function handler() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !CLOUDFLARE_CUSTOMER_CODE) {
    console.error('check-livestream-status: missing required environment variables, skipping run.');
    return { statusCode: 500, body: 'Missing environment variables' };
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: streams, error } = await supabase
    .from('livestreams')
    .select('id, provider_stream_id, status')
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
      }
    } catch (err) {
      console.error(`check-livestream-status: error checking stream ${stream.id}:`, err);
    }
  }

  console.log(`check-livestream-status: checked ${checked} stream(s), updated ${updated}.`);
  return { statusCode: 200, body: `Checked ${checked}, updated ${updated}` };
}
