// Sends transactional emails (church-approved, editor-activated) via
// Resend's HTTP API directly. This is separate from Supabase Auth's own
// SMTP configuration (used for signup confirmation / password reset) —
// that was wired up directly in Supabase's dashboard and doesn't cover
// emails triggered by our own app logic, so those go through here instead.
// Reuses the same verified sending domain (updates.lotu.live) from that
// earlier setup.

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'LOTU.LIVE <noreply@updates.lotu.live>';

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  if (!RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY not set — skipping email "${subject}" to ${to}`);
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, text }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Failed to send email "${subject}" to ${to}:`, res.status, body);
    }
  } catch (err) {
    // Non-fatal by design — a failed notification email should never
    // block the underlying approval/activation action from completing.
    console.error(`Email send error for "${subject}" to ${to}:`, err);
  }
}
