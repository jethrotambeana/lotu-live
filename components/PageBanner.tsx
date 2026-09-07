import Image from 'next/image';

// Same full-bleed treatment as the homepage hero (app/page.tsx): shown at
// its exact natural aspect ratio so nothing is ever cropped on any screen
// size — it scales shorter on narrow phones rather than losing content
// unpredictably. All eight banner images are 2048x768, matching this ratio
// exactly, so none of them need cropping or repositioning.
export default function PageBanner({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative aspect-[2048/768] w-full">
      <Image src={src} alt={alt} fill priority sizes="100vw" className="object-cover" />
    </div>
  );
}
