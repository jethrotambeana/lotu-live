import Link from 'next/link';
import Image from 'next/image';

export interface SeriesCardProps {
  slug: string;
  name: string;
  coverImage?: string | null;
  episodeCount: number;
}

export default function SeriesCard({ slug, name, coverImage, episodeCount }: SeriesCardProps) {
  return (
    <Link href={`/series/${slug}`} className="group block">
      <div className="relative aspect-video overflow-hidden rounded bg-slate-100">
        <div className="shimmer-bg absolute inset-0" />
        {coverImage && (
          <Image
            src={coverImage}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
        )}
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-2 py-0.5 text-xs font-semibold text-white">
          {episodeCount} episode{episodeCount === 1 ? '' : 's'}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium">{name}</p>
      <p className="text-xs text-slate-500">Series</p>
    </Link>
  );
}
