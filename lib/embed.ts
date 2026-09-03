// Whitelisted, template-based embed generation.
// Admins never paste iframe/HTML into the database (see design doc §14).
// They select a provider and supply only the provider's own ID/URL.

export type Provider = 'cloudflare' | 'youtube' | 'facebook' | 'hls';

export interface EmbedResult {
  kind: 'iframe' | 'hls';
  src: string;
}

// Exported (not just used internally) so admin actions.ts files — for both
// livestreams and videos — can derive thumbnail URLs from the same ID the
// player embed uses, instead of re-implementing this parsing per feature.
export const CLOUDFLARE_CUSTOMER_CODE = process.env.NEXT_PUBLIC_CLOUDFLARE_CUSTOMER_CODE || '';

export function extractYouTubeId(input: string): string {
  const trimmed = input.trim();
  const patterns = [
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{6,20})/,
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{6,20})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,20})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{6,20})/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return trimmed;
}

export function extractCloudflareId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/cloudflarestream\.com\/([a-zA-Z0-9]+)/);
  return match ? match[1] : trimmed;
}

export function buildEmbed(provider: Provider, providerStreamId: string): EmbedResult {
  switch (provider) {
    case 'cloudflare':
      return {
        kind: 'iframe',
        src: `https://customer-${CLOUDFLARE_CUSTOMER_CODE}.cloudflarestream.com/${encodeURIComponent(
          extractCloudflareId(providerStreamId)
        )}/iframe`,
      };
    case 'youtube':
      return {
        kind: 'iframe',
        src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
          extractYouTubeId(providerStreamId)
        )}?autoplay=0`,
      };
    case 'facebook':
      return {
        kind: 'iframe',
        src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
          providerStreamId
        )}&autoplay=false`,
      };
    case 'hls':
      return { kind: 'hls', src: providerStreamId };
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export function isPlausibleProviderId(provider: Provider, value: string): boolean {
  if (!value || value.length > 500) return false;
  switch (provider) {
    case 'cloudflare':
      return /^[a-zA-Z0-9_-]+$/.test(value);
    case 'youtube':
      return /^[a-zA-Z0-9_-]{6,20}$/.test(value);
    case 'facebook':
      return value.startsWith('https://www.facebook.com/');
    case 'hls':
      return value.startsWith('https://') && value.endsWith('.m3u8');
    default:
      return false;
  }
}
