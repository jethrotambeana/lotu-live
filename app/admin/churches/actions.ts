'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function saveChurch(formData: FormData) {
  const id = formData.get('id') as string | null;
  const supabase = createClient();

  const record = {
    name: formData.get('name') as string,
    slug: (formData.get('slug') as string) || slugify(formData.get('name') as string),
    country_id: (formData.get('country_id') as string) || null,
    island_province: (formData.get('island_province') as string) || null,
    town: (formData.get('town') as string) || null,
    address: (formData.get('address') as string) || null,
    phone: (formData.get('phone') as string) || null,
    email: (formData.get('email') as string) || null,
    website: (formData.get('website') as string) || null,
    facebook: (formData.get('facebook') as string) || null,
    youtube: (formData.get('youtube') as string) || null,
    description: (formData.get('description') as string) || null,
    worship_times: (formData.get('worship_times') as string) || null,
  };

  if (id) {
    await supabase.from('churches').update(record).eq('id', id);
  } else {
    await supabase.from('churches').insert(record);
  }

  revalidatePath('/admin/churches');
  revalidatePath('/churches');
  redirect('/admin/churches');
}

export async function deleteChurch(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();
  await supabase.from('churches').delete().eq('id', id);
  revalidatePath('/admin/churches');
  revalidatePath('/churches');
}
