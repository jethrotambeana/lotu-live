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

export async function saveEvent(formData: FormData) {
  const id = formData.get('id') as string | null;
  const supabase = createClient();

  const record = {
    name: formData.get('name') as string,
    slug: (formData.get('slug') as string) || slugify(formData.get('name') as string),
    hosted_by: (formData.get('hosted_by') as string) || null,
    country_id: (formData.get('country_id') as string) || null,
    description: (formData.get('description') as string) || null,
    venue: (formData.get('venue') as string) || null,
    town: (formData.get('town') as string) || null,
    island_province: (formData.get('island_province') as string) || null,
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    start_time: (formData.get('start_time') as string) || null,
    end_time: (formData.get('end_time') as string) || null,
    website: (formData.get('website') as string) || null,
    facebook: (formData.get('facebook') as string) || null,
    youtube: (formData.get('youtube') as string) || null,
    poster_url: (formData.get('poster_url') as string) || null,
    status: (formData.get('status') as string) || 'upcoming',
  };

  if (id) {
    await supabase.from('events').update(record).eq('id', id);
  } else {
    await supabase.from('events').insert(record);
  }

  revalidatePath('/admin/events');
  revalidatePath('/events');
  redirect('/admin/events');
}

export async function deleteEvent(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();
  await supabase.from('events').delete().eq('id', id);
  revalidatePath('/admin/events');
  revalidatePath('/events');
}
