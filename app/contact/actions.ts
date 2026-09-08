'use server';

import { createClient } from '@/lib/supabaseServer';
import { sendEmail } from '@/lib/email';

export async function submitContactMessage(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const country = (formData.get('country') as string) || '';
  const subject = formData.get('subject') as string;
  const message = formData.get('message') as string;

  const supabase = createClient();
  const { error } = await supabase.from('contacts').insert({ name, email, subject, message });

  if (error) {
    console.error('Failed to save contact message:', error);
    return { error: 'Something went wrong — please try again.' };
  }

  // Notify every admin account, same recipient pattern as
  // netlify/functions/pending-digest.ts. Best-effort: a failed email here
  // never blocks the confirmation the sender sees — the message is already
  // safely saved and visible in Admin → Messages regardless.
  try {
    const { data: admins } = await supabase.from('profiles').select('email').eq('role', 'admin');
    const recipients = (admins ?? []).map((a: any) => a.email).filter(Boolean);

    await Promise.all(
      recipients.map((to: string) =>
        sendEmail({
          to,
          subject: `New contact message: ${subject}`,
          text: `New message from the LOTU.LIVE contact form:

Name: ${name}
Email: ${email}
${country ? `Country: ${country}\n` : ''}Subject: ${subject}

${message}

— View in Admin → Messages: https://lotu.live/admin/messages`,
        })
      )
    );
  } catch (err) {
    console.error('Failed to send contact notification email:', err);
  }

  return { success: true };
}
