'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function saveAboutPage(formData: FormData) {
  const supabase = createClient();

  const value = {
    tagline: (formData.get('tagline') as string) || null,
    content: (formData.get('content') as string) || null,
    image_url: (formData.get('image_url') as string) || null,
  };

  const { error } = await supabase
    .from('site_settings')
    .upsert({ key: 'about_page', value }, { onConflict: 'key' });

  if (error) {
    console.error('Failed to save About page settings:', error);
    throw new Error(`Failed to save: ${error.message}`);
  }

  revalidatePath('/admin/about');
  revalidatePath('/about');
  redirect('/admin/about');
}
