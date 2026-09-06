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

export async function saveMinistry(formData: FormData) {
  const id = formData.get('id') as string | null;
  const supabase = createClient();

  const record = {
    name: formData.get('name') as string,
    slug: (formData.get('slug') as string) || slugify(formData.get('name') as string),
    type: (formData.get('type') as string) || 'other',
    church_id: (formData.get('church_id') as string) || null,
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
    approved: formData.get('approved') === 'on',
  };

  if (id) {
    const { error } = await supabase.from('ministries').update(record).eq('id', id);
    if (error) {
      console.error('Failed to update ministry:', error);
      throw new Error(`Failed to save: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from('ministries').insert(record);
    if (error) {
      console.error('Failed to create ministry:', error);
      throw new Error(`Failed to save: ${error.message}`);
    }
  }

  revalidatePath('/admin/ministries');
  revalidatePath('/ministries');
  redirect('/admin/ministries');
}

export async function deleteMinistry(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();

  // Same dependent-record check pattern as deleteChurch — ministries is
  // referenced by videos.ministry_id, events.host_ministry_id, and
  // profiles.ministry_id with no cascade.
  const [{ count: videoCount }, { count: eventCount }, { count: editorCount }] = await Promise.all([
    supabase.from('videos').select('id', { count: 'exact', head: true }).eq('ministry_id', id),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('host_ministry_id', id),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('ministry_id', id),
  ]);

  const blockers: string[] = [];
  if (videoCount) blockers.push(`${videoCount} video${videoCount === 1 ? '' : 's'}`);
  if (eventCount) blockers.push(`${eventCount} event${eventCount === 1 ? '' : 's'}`);
  if (editorCount) blockers.push(`${editorCount} linked editor account${editorCount === 1 ? '' : 's'}`);

  if (blockers.length > 0) {
    const message = `Can't delete this ministry — it still has ${blockers.join(
      ', '
    )} attached. Delete/reassign the events and videos first.${
      editorCount ? ' You can unlink the editor account below.' : ''
    }`;
    redirect(`/admin/ministries?error=${encodeURIComponent(message)}&blockedId=${id}`);
  }

  const { error } = await supabase.from('ministries').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete ministry:', error);
    redirect(`/admin/ministries?error=${encodeURIComponent(`Failed to delete ministry: ${error.message}`)}`);
  }

  revalidatePath('/admin/ministries');
  revalidatePath('/ministries');
}

export async function unlinkMinistryEditors(formData: FormData) {
  const ministryId = formData.get('ministryId') as string;
  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ role: 'viewer', ministry_id: null })
    .eq('ministry_id', ministryId);

  if (error) {
    console.error('Failed to unlink ministry editors:', error);
    redirect(`/admin/ministries?error=${encodeURIComponent(`Failed to unlink editor: ${error.message}`)}`);
  }

  revalidatePath('/admin/ministries');
  redirect('/admin/ministries');
}
