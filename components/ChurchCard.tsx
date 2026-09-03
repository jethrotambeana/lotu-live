import Link from 'next/link';
import Image from 'next/image';

export interface ChurchCardProps {
  slug: string;
  name: string;
  town?: string | null;
  island_province?: string | null;
  countryName?: string | null;
  logo_url?: string | null;
}

export default function ChurchCard({
  slug,
  name,
  town,
  island_province,
  countryName,
  logo_url,
}: ChurchCardProps) {
  return (
    <Link
      href={`/church/${slug}`}
      className="flex items-start gap-3 rounded border border-slate-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
        {logo_url && <Image src={logo_url} alt={name} fill className="object-cover" />}
      </div>
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-sm text-slate-500">
          {town}
          {town && island_province ? ', ' : ''}
          {island_province}
        </p>
        {countryName && <p className="text-xs text-slate-400">{countryName}</p>}
      </div>
    </Link>
  );
}
