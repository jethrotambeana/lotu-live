'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireChurchEditor } from '@/lib/requireChurchEditor';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function saveMyEvent(formData: FormData) {
  const { supabase, churchId } = await requireChurchEditor();
  const id = formData.get('id') as string | null;

  const record = {
    name: formData.get('name') as string,
    slug: (formData.get('slug') as string) || slugify(formData.get('name') as string),
    host_church_id: churchId, // always forced — never trust a client-supplied church id
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
    // Every editor save — new or edited — requires admin re-approval before
    // it's visible on the public site, even if this event was previously
    // approved. Only /admin can flip this back to true.
    approved: false,
  };

  let query;
  if (id) {
    query = supabase.from('events').update(record).eq('id', id).eq('host_church_id', churchId);
  } else {
    query = supabase.from('events').insert(record);
  }
  const { error } = await query;
  if (error) {
    console.error('Failed to save event (editor):', error);
    throw new Error(`Failed to save: ${error.message}`);
  }

  revalidatePath('/manage/events');
  revalidatePath('/events');
  redirect('/manage/events');
}

export async function deleteMyEvent(formData: FormData) {
  const { supabase, churchId } = await requireChurchEditor();
  const id = formData.get('id') as string;
  await supabase.from('events').delete().eq('id', id).eq('host_church_id', churchId);
  revalidatePath('/manage/events');
  revalidatePath('/events');
}
