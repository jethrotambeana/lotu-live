import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export default function AccountInactivePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="mb-3 text-2xl font-bold">Listing Currently Inactive</h1>
      <p className="mb-6 text-slate-600">
        The church or ministry linked to your account has been temporarily set to
        inactive by a site admin, so editor access is paused for now. This doesn't
        affect your account itself — please contact the site admin if you believe
        this is a mistake or would like it reactivated.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link href="/" className="rounded border border-slate-300 px-4 py-2 text-sm">
          Back to Homepage
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
}
