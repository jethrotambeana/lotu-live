import Link from 'next/link';
import VideoThumbnail from './VideoThumbnail';

export interface VideoCardProps {
  slug: string;
  title: string;
  thumbnail?: string | null;
  speaker?: string | null;
  provider?: 'cloudflare' | 'youtube' | 'cloudinary' | null;
  providerVideoId?: string | null;
}

export default function VideoCard({ slug, title, thumbnail, speaker, provider, providerVideoId }: VideoCardProps) {
  return (
    <Link href={`/video/${slug}`} className="group block">
      <VideoThumbnail
        thumbnail={thumbnail}
        title={title}
        provider={provider}
        providerVideoId={providerVideoId}
      />
      <p className="mt-2 text-sm font-medium">{title}</p>
      {speaker && <p className="text-xs text-slate-500">{speaker}</p>}
    </Link>
  );
}
