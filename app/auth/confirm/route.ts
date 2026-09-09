import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

// This is the piece that was missing entirely: Supabase's confirmation
// link does its own verification server-side, then redirects the browser
// back here with the result. Without this route, that redirect had
// nowhere meaningful to land — no code anywhere read the result, so
// confirming (or failing to confirm) was completely silent either way.
//
// Requires the Supabase dashboard's "Confirm signup" email template to be
// updated to link here instead of the default {{ .ConfirmationURL }} —
// see the accompanying rollout notes. That's a dashboard change, not
// something this file alone can control.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/login?confirmed=1';

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
