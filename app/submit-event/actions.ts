'use server';

import { createClient } from '@/lib/supabaseServer';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function submitEvent(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const verified = await verifyTurnstileToken(formData.get('turnstileToken') as string | null);
  if (!verified) {
    return { success: false, error: 'Verification failed — please try again.' };
  }

  const supabase = createClient();
  const record = {
    event_name: formData.get('event_name') as string,
    hosted_by: (formData.get('hosted_by') as string) || null,
    host_church_id: (formData.get('host_church_id') as string) || null,
    host_ministry_id: (formData.get('host_ministry_id') as string) || null,
    country_id: (formData.get('country_id') as string) || null,
    island_province: (formData.get('island_province') as string) || null,
    venue: (formData.get('venue') as string) || null,
    town: (formData.get('town') as string) || null,
    start_date: formData.get('start_date') as string,
    // Postgres's date/time column types reject an empty string outright
    // (only a valid value or null is accepted) — same handling the form
    // already did client-side, now enforced here instead.
    end_date: (formData.get('end_date') as string) || null,
    start_time: (formData.get('start_time') as string) || null,
    end_time: (formData.get('end_time') as string) || null,
    description: (formData.get('description') as string) || null,
    contact_name: formData.get('contact_name') as string,
    email: formData.get('email') as string,
    phone: (formData.get('phone') as string) || null,
    website: (formData.get('website') as string) || null,
    facebook: (formData.get('facebook') as string) || null,
    youtube: (formData.get('youtube') as string) || null,
    poster_url: (formData.get('poster_url') as string) || null,
  };

  const { error } = await supabase.from('event_submissions').insert(record);
  if (error) {
    console.error('submitEvent: insert failed:', error);
    return { success: false, error: 'Something went wrong — please try again.' };
  }
  return { success: true };
}
