import Image from 'next/image';

// Desktop: full 2048x768 image, uncropped, exactly as before.
// Mobile (below Tailwind's `sm` breakpoint, 640px): these images were
// designed as wide "billboard" graphics — at native ratio on a narrow
// phone they shrink down to ~270px tall, making the tagline and icon row
// illegible. Below `sm`, this switches to a taller 4:3 box and crops to
// the image's LEFT side via object-left — that's where the "Lotu.live
// [Title]" wordmark sits in all 8 banner images, so mobile users see a
// larger, legible version of the title area instead of a tiny, unreadable
// full-width strip. The right-side decorative photo collage is cropped
// off on mobile only; desktop is unaffected.
export default function PageBanner({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative aspect-[4/3] w-full sm:aspect-[2048/768]">
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-left sm:object-center"
      />
    </div>
  );
}
