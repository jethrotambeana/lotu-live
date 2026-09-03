import Link from 'next/link';
import Image from 'next/image';

export interface VideoCardProps {
  slug: string;
  title: string;
  thumbnail?: string | null;
  speaker?: string | null;
}

export default function VideoCard({ slug, title, thumbnail, speaker }: VideoCardProps) {
  return (
    <Link href={`/video/${slug}`} className="block">
      <div className="relative aspect-video overflow-hidden rounded bg-slate-100">
        {thumbnail && <Image src={thumbnail} alt={title} fill className="object-cover" />}
      </div>
      <p className="mt-2 text-sm font-medium">{title}</p>
      {speaker && <p className="text-xs text-slate-500">{speaker}</p>}
    </Link>
  );
}
