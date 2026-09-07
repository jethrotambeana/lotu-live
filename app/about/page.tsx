import { createClient } from '@/lib/supabaseServer';
import Image from 'next/image';
import PageBanner from '@/components/PageBanner';

const FALLBACK = {
  tagline: 'The Pacific Gospel Media Network',
  content: `LOTU.LIVE brings together Seventh-day Adventist worship services, evangelistic meetings, youth programs, camp meetings and other religious livestreams into one easy-to-use website — a single place to discover and watch, rather than searching separately across Facebook, YouTube, church websites and streaming providers.

Our initial focus covers Vanuatu, Solomon Islands, Papua New Guinea and Fiji, with the platform built so more Pacific countries can join over time.

Streams and videos remain hosted on trusted platforms — YouTube, Cloudflare Stream, Facebook and other providers — while LOTU.LIVE organises everything into a searchable, branded directory that makes it easy for churches to be found and for viewers to watch worship together, wherever they are.`,
  image_url: null as string | null,
};

export default async function AboutPage() {
  const supabase = createClient();
  const { data } = await supabase.from('site_settings').select('value').eq('key', 'about_page').maybeSingle();

  const settings = (data?.value as typeof FALLBACK) || FALLBACK;
  const tagline = settings.tagline || FALLBACK.tagline;
  const content = settings.content || FALLBACK.content;
  const imageUrl = settings.image_url;

  const paragraphs = content.split(/\n\s*\n/).filter(Boolean);

  return (
    <>
      <PageBanner src="/banner-about.jpg" alt="About — LOTU.LIVE" />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="sr-only">About LOTU.LIVE</h1>
        <p className="text-lg font-medium text-sky-600">{tagline}</p>

        {imageUrl && (
          <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-lg bg-slate-100">
            <Image src={imageUrl} alt={tagline} fill className="object-cover" />
          </div>
        )}

        {paragraphs.map((paragraph, i) => (
          <p key={i} className="mt-4 text-slate-700">
            {paragraph}
          </p>
        ))}
      </div>
    </>
  );
}
