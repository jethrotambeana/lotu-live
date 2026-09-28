import { createClient } from '@/lib/supabaseServer';
import { getChannelState } from '@/lib/channelEmbed';
import ChannelClient from '@/components/ChannelClient';

export const metadata = {
  title: 'LOTU.Live Channel — Watch Now',
  description:
    'Pacific Gospel media, playing continuously — livestreams take over automatically the moment one begins.',
};

// Only the initial paint (and SEO metadata) is computed here on the
// server. From then on, ChannelClient polls /api/channel-status itself —
// this page is deliberately never re-rendered via router.refresh() again,
// since that was found to occasionally disturb the embedded video iframe
// (a black flash, and the mute/volume the viewer had set getting reset)
// even when nothing meaningful had actually changed.
export default async function ChannelPage() {
  const supabase = createClient();
  const initial = await getChannelState(supabase);
  return <ChannelClient initial={initial} />;
}
