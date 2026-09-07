import Image from 'next/image';

// Two real, purpose-designed images now — not one image cropped by CSS.
// `mobileSrc` (1448x1086, 4:3) renders below the `sm` breakpoint (640px);
// `src` (2048x768) renders at `sm` and above, exactly as before. Only one
// of the two <Image> elements is ever visible at a time — `hidden`/`block`
// toggling, not display:none-via-JS, so there's no layout shift and no
// double image request (Next.js's Image component only fetches images
// that are actually going to render, and only one of these two is active
// at any given viewport width).
//
// The gradient strip below fades from the banners' actual bottom-edge blue
// (#003076, sampled directly from the images) down to transparent over 48px,
// sitting on the page's white background — softens the hard line where the
// banner currently just stops, without touching the page background itself.
export default function PageBanner({
  src,
  mobileSrc,
  alt,
}: {
  src: string;
  mobileSrc: string;
  alt: string;
}) {
  return (
    <>
      <div className="relative aspect-[1448/1086] w-full sm:hidden">
        <Image src={mobileSrc} alt={alt} fill priority sizes="100vw" className="object-cover" />
      </div>
      <div className="relative hidden aspect-[2048/768] w-full sm:block">
        <Image src={src} alt={alt} fill priority sizes="100vw" className="object-cover" />
      </div>
      <div
        className="h-12 w-full"
        style={{ background: 'linear-gradient(to bottom, #003076, rgba(0,48,118,0))' }}
        aria-hidden="true"
      />
    </>
  );
}
