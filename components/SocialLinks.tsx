function normalizeUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  // Values stored without a protocol (e.g. "bhsda.app") get treated by the
  // browser as a path relative to the current page rather than an absolute
  // URL — hence links resolving to /church/bhsda.app instead of leaving the
  // site. Prepending https:// fixes that for any value missing a protocol.
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export interface SocialLinksProps {
  website?: string | null;
  facebook?: string | null;
  youtube?: string | null;
}

export default function SocialLinks({ website, facebook, youtube }: SocialLinksProps) {
  const links = [
    normalizeUrl(website) && {
      href: normalizeUrl(website)!,
      label: 'Website',
      icon: <GlobeIcon />,
      color: '#475569', // slate-600 — neutral, not a brand color
    },
    normalizeUrl(facebook) && {
      href: normalizeUrl(facebook)!,
      label: 'Facebook',
      icon: <FacebookIcon />,
      color: '#1877F2', // Facebook brand blue
    },
    normalizeUrl(youtube) && {
      href: normalizeUrl(youtube)!,
      label: 'YouTube',
      icon: <YouTubeIcon />,
      color: '#FF0000', // YouTube brand red
    },
  ].filter(Boolean) as { href: string; label: string; icon: JSX.Element; color: string }[];

  if (links.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          title={link.label}
          style={{ color: link.color }}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 transition-opacity hover:opacity-75"
        >
          {link.icon}
        </a>
      ))}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.17 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.9h-2.34V22c4.78-.77 8.44-4.94 8.44-9.94z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31 31 0 000 12a31 31 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31 31 0 0024 12a31 31 0 00-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z" />
    </svg>
  );
}
