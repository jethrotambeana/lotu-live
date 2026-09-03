import { extractYouTubeId, extractCloudflareId, CLOUDFLARE_CUSTOMER_CODE } from '@/lib/embed';

// YouTube serves this thumbnail for every public video at a stable URL —
// no API key needed. hqdefault is used (not maxresdefault) because it's
// guaranteed to exist for every video; maxresdefault 404s on many older
// or lower-resolution uploads. i.ytimg.com (not img.youtube.com) is used
// because that's the hostname allowlisted in next.config.js.
export function deriveYouTubeThumbnail(providerId: string): string {
  return `https://i.ytimg.com/vi/${extractYouTubeId(providerId)}/hqdefault.jpg`;
}

// Cloudflare Stream auto-generates a thumbnail at this stable path for
// every uploaded video/stream — same customer subdomain used in
// lib/embed.ts for the player, and allowlisted in next.config.js
// (**.cloudflarestream.com).
export function deriveCloudflareThumbnail(providerId: string): string {
  return `https://customer-${CLOUDFLARE_CUSTOMER_CODE}.cloudflarestream.com/${extractCloudflareId(
    providerId
  )}/thumbnails/thumbnail.jpg`;
}
