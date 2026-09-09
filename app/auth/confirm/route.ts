import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

// Only ever redirect to a same-site relative path. `next` comes straight
// from the query string — without this check, a crafted link like
// /auth/confirm?token_hash=<valid>&type=email&next=https://evil.example.com
// would send the browser to an external site immediately after a
// legitimate token verification (i.e. right after a real session gets
// set), which is exactly what a phishing page wants. Requiring a leading
// "/" blocks absolute URLs; also rejecting a leading "//" blocks the
// protocol-relative trick (`//evil.com` is parsed as `https://evil.com`
// by browsers, even though it "starts with /").
function safeNext(value: string | null, fallback: string): string {
  if (value && value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }
  return fallback;
}

// This is the piece that was missing entirely: Supabase's confirmation
// link does its own verification server-side, then redirects the browser
// back here with the result. Without this route, that redirect had
// nowhere meaningful to land — no code anywhere read the result, so
// confirming (or failing to confirm) was completely silent either way.
//
// Requires the Supabase dashboard's "Confirm signup" and "Reset Password"
// email templates to be updated to link here instead of the default
// {{ .ConfirmationURL }} — see the rollout notes from when this was built.
// That's a dashboard change, not something this file alone can control.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeNext(searchParams.get('next'), '/login?confirmed=1');

  if (token_hash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }

    console.error('Email confirmation failed:', error.message);
    return NextResponse.redirect(
      new URL(`/login?confirmError=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  return NextResponse.redirect(
    new URL(
      `/login?confirmError=${encodeURIComponent('This confirmation link is invalid or has expired — please sign up again.')}`,
      request.url
    )
  );
}
