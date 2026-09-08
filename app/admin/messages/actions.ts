'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteMessage(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();

  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete message:', error);
    redirect(`/admin/messages?error=${encodeURIComponent(`Failed to delete message: ${error.message}`)}`);
  }

  revalidatePath('/admin/messages');
}
