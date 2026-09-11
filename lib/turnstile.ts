const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';

// Two different failure modes, handled deliberately differently:
//
// - Secret key not configured at all -> fail OPEN (allow the submission
//   through unverified), so forms don't silently break for every visitor
//   during rollout before the env var is set. Logs a warning so this is
//   easy to notice and isn't mistaken for "working."
// - Secret key IS configured but the verification request itself fails
//   (network hiccup, Cloudflare outage) -> fail CLOSED (reject the
//   submission). The alternative — treating a failed check as a pass —
//   would mean any Cloudflare hiccup silently disables spam protection
//   entirely, which is a worse failure mode than a legitimate submitter
//   occasionally needing to retry.
export async function verifyTurnstileToken(token: string | null): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY) {
    console.warn(
      'verifyTurnstileToken: TURNSTILE_SECRET_KEY not set — allowing submissions through unverified. Set this env var to actually enable spam protection.'
    );
    return true;
  }

  if (!token) return false;

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('verifyTurnstileToken: verification request failed:', err);
    return false;
  }
}
