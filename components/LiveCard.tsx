import Image from 'next/image';
import Link from 'next/link';

export interface LiveCardProps {
  slug: string;
  name: string;
  location: string;
  status: 'live' | 'offline' | 'upcoming' | 'scheduled';
  previewImage?: string | null;
}

export default function LiveCard({ slug, name, location, status, previewImage }: LiveCardProps) {
  return (
    <Link
      href={`/watch/${slug}`}
      className="group block overflow-hidden rounded-lg border border-slate-200 transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        <div className="shimmer-bg absolute inset-0" />
        {previewImage && (
          <Image
            src={previewImage}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
        )}
        {status === 'live' && (
          <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            LIVE
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-slate-900">{name}</p>
        <p className="text-sm text-slate-500">{location}</p>
      </div>
    </Link>
  );
}
