'use server';

import { createClient } from '@/lib/supabaseServer';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function submitChurch(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const verified = await verifyTurnstileToken(formData.get('turnstileToken') as string | null);
  if (!verified) {
    return { success: false, error: 'Verification failed — please try again.' };
  }

  const supabase = createClient();
  const record = {
    church_name: formData.get('church_name') as string,
    country_id: (formData.get('country_id') as string) || null,
    island_province: (formData.get('island_province') as string) || null,
    location: (formData.get('location') as string) || null,
    contact_name: formData.get('contact_name') as string,
    email: formData.get('email') as string,
    phone: (formData.get('phone') as string) || null,
    website: (formData.get('website') as string) || null,
    facebook: (formData.get('facebook') as string) || null,
    youtube: (formData.get('youtube') as string) || null,
  };

  const { error } = await supabase.from('submissions').insert(record);
  if (error) {
    console.error('submitChurch: insert failed:', error);
    return { success: false, error: 'Something went wrong — please try again.' };
  }
  return { success: true };
}
