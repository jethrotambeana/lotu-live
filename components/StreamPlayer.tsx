'use client';

import { buildEmbed, Provider } from '@/lib/embed';

export default function StreamPlayer({
  provider,
  providerStreamId,
}: {
  provider: Provider;
  providerStreamId: string;
}) {
  const embed = buildEmbed(provider, providerStreamId);

  if (embed.kind === 'iframe') {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={embed.src}
          className="h-full w-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
        />
      </div>
    );
  }

  // HLS: rendered client-side with a plain <video> + hls.js in a real build.
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <video src={embed.src} controls className="h-full w-full" />
    </div>
  );
}
