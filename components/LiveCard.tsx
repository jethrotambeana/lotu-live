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
      className="block overflow-hidden rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-video bg-slate-100">
        {previewImage && (
          <Image src={previewImage} alt={name} fill className="object-cover" />
        )}
        {status === 'live' && (
          <span className="absolute top-2 left-2 rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
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
