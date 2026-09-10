import QRCode from 'qrcode';

// Server Component, deliberately async — generates the QR code as a PNG
// data URI at render time using the `qrcode` npm package, rather than
// calling out to a third-party QR-generation API on every page view.
// That would make a core piece of every church/event page's display
// depend on some external service staying up and free forever; this way
// it's fully self-contained; no network call, no client JS, no ongoing
// external dependency.
//
// Rendered as a plain <img> (not next/image — data URIs aren't something
// its optimizer handles) wrapped in a download link, so a church admin
// can right-click-save or just click straight through to download a
// print-ready PNG for a bulletin or poster.
export default async function QRCodeImage({
  value,
  size = 160,
  downloadName,
}: {
  value: string;
  size?: number;
  downloadName: string;
}) {
  const dataUrl = await QRCode.toDataURL(value, {
    width: size,
    margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' },
  });

  return (
    <a
      href={dataUrl}
      download={downloadName}
      title="Download QR code"
      className="inline-flex flex-col items-center gap-1"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={`QR code linking to ${value}`}
        width={size}
        height={size}
        className="rounded border border-slate-200"
      />
      <span className="text-xs text-slate-500 underline">Download QR code</span>
    </a>
  );
}
