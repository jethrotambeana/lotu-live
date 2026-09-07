import Link from 'next/link';
import Image from 'next/image';

export interface EventCardProps {
  slug: string;
  name: string;
  venue?: string | null;
  town?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  poster_url?: string | null;
}

export default function EventCard({
  slug,
  name,
  venue,
  town,
  start_date,
  end_date,
  status,
  poster_url,
}: EventCardProps) {
  return (
    <Link
      href={`/event/${slug}`}
      className="group block overflow-hidden rounded border border-slate-200 transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        <div className="shimmer-bg absolute inset-0" />
        {poster_url && (
          <Image
            src={poster_url}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
        )}
      </div>
      <div className="p-4">
        <span className="text-xs font-semibold uppercase text-sky-600">{status}</span>
        <p className="font-medium">{name}</p>
        <p className="text-sm text-slate-500">
          {venue}
          {venue && town ? ', ' : ''}
          {town}
        </p>
        <p className="text-xs text-slate-400">
          {start_date} – {end_date}
        </p>
      </div>
    </Link>
  );
}
