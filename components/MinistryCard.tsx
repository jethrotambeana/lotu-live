import Link from 'next/link';
import Image from 'next/image';

const MINISTRY_TYPE_LABELS: Record<string, string> = {
  music_singing: 'Music / Singing',
  media_video: 'Media / Video',
  livestream_team: 'Livestream Team',
  youth: 'Youth',
  outreach: 'Outreach',
  prayer: 'Prayer',
  childrens: "Children's",
  other: 'Other',
};

export interface MinistryCardProps {
  slug: string;
  name: string;
  type: string;
  town?: string | null;
  churchName?: string | null;
  logoUrl?: string | null;
}

export default function MinistryCard({ slug, name, type, town, churchName, logoUrl }: MinistryCardProps) {
  return (
    <Link
      href={`/ministry/${slug}`}
      className="flex items-start gap-3 rounded border border-slate-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
        {logoUrl && <Image src={logoUrl} alt={name} fill className="object-cover" />}
      </div>
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-sm text-slate-500">{MINISTRY_TYPE_LABELS[type] || type}</p>
        {(town || churchName) && (
          <p className="text-xs text-slate-400">
            {town}
            {town && churchName ? ' · ' : ''}
            {churchName ? `Part of ${churchName}` : ''}
          </p>
        )}
      </div>
    </Link>
  );
}
