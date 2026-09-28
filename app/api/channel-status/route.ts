import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { getChannelState } from '@/lib/channelEmbed';

// Polled every 20s by the Channel page's client-side component to decide
// whether to cut to a different video/live stream — must never be cached
// (by Next's data cache, a CDN, or the browser), or viewers would get
// stuck on stale schedule data.
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const state = await getChannelState(supabase);
  return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
}
