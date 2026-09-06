'use server';

import { revalidatePath } from 'next/cache';
import { requireChurchEditor } from '@/lib/requireChurchEditor';
import { requireEditor } from '@/lib/requireEditor';

export async function saveMyChurch(formData: FormData) {
  const { supabase, churchId } = await requireChurchEditor();

  const record = {
    name: formData.get('name') as string,
    logo_url: (formData.get('logo_url') as string) || null,
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

  // churchId comes from the authenticated session via requireChurchEditor,
  // never from the form — an editor cannot target any church but their own,
  // and RLS backs this up at the database level regardless.
  const { data, error } = await supabase
    .from('churches')
    .update(record)
    .eq('id', churchId)
    .select('slug')
    .single();

  if (error) {
    console.error('Failed to update church (editor):', error);
    throw new Error(`Failed to save: ${error.message}`);
  }

  revalidatePath('/manage');
  revalidatePath('/churches');
  if (data?.slug) revalidatePath(`/church/${data.slug}`);
}

export async function saveMyMinistry(formData: FormData) {
  const { supabase, scope } = await requireEditor();
  if (scope.type !== 'ministry') {
    throw new Error('Not a ministry editor.');
  }

  const record = {
    name: formData.get('name') as string,
    type: (formData.get('type') as string) || 'other',
    logo_url: (formData.get('logo_url') as string) || null,
    country_id: (formData.get('country_id') as string) || null,
    island_province: (formData.get('island_province') as string) || null,
    town: (formData.get('town') as string) || null,
    phone: (formData.get('phone') as string) || null,
    email: (formData.get('email') as string) || null,
    website: (formData.get('website') as string) || null,
    facebook: (formData.get('facebook') as string) || null,
    youtube: (formData.get('youtube') as string) || null,
    description: (formData.get('description') as string) || null,
  };

  // scope.id comes from the authenticated session via requireEditor, never
  // from the form — an editor cannot target any ministry but their own,
  // and RLS backs this up at the database level regardless.
  const { data, error } = await supabase
    .from('ministries')
    .update(record)
    .eq('id', scope.id)
    .select('slug')
    .single();

  if (error) {
    console.error('Failed to update ministry (editor):', error);
    throw new Error(`Failed to save: ${error.message}`);
  }

  revalidatePath('/manage');
  revalidatePath('/ministries');
  if (data?.slug) revalidatePath(`/ministry/${data.slug}`);
}
