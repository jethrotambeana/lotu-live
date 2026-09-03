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
      className="block overflow-hidden rounded border border-slate-200 hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-video bg-slate-100">
        {poster_url && <Image src={poster_url} alt={name} fill className="object-cover" />}
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
