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

  if (id) {
    const { error } = await supabase.from('churches').update(record).eq('id', id);
    if (error) {
      console.error('Failed to update church:', error);
      throw new Error(`Failed to save church: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from('churches').insert(record);
    if (error) {
      console.error('Failed to create church:', error);
      throw new Error(`Failed to save church: ${error.message}`);
    }
  }

  revalidatePath('/admin/churches');
  revalidatePath('/churches');
  redirect('/admin/churches');
}

export async function deleteChurch(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();

  // Churches are referenced by livestreams, events, videos, and profiles
  // (an editor's church_id) with no ON DELETE cascade, so Postgres blocks
  // the delete outright if any of these still point at it. Check first
  // and give a specific, actionable message rather than a raw FK-violation
  // error — or worse, silently doing nothing.
  const [{ count: livestreamCount }, { count: eventCount }, { count: videoCount }, { count: editorCount }] =
    await Promise.all([
      supabase.from('livestreams').select('id', { count: 'exact', head: true }).eq('church_id', id),
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('host_church_id', id),
      supabase.from('videos').select('id', { count: 'exact', head: true }).eq('church_id', id),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('church_id', id),
    ]);

  const blockers: string[] = [];
  if (livestreamCount) blockers.push(`${livestreamCount} livestream${livestreamCount === 1 ? '' : 's'}`);
  if (eventCount) blockers.push(`${eventCount} event${eventCount === 1 ? '' : 's'}`);
  if (videoCount) blockers.push(`${videoCount} video${videoCount === 1 ? '' : 's'}`);
  if (editorCount) blockers.push(`${editorCount} linked editor account${editorCount === 1 ? '' : 's'}`);

  if (blockers.length > 0) {
    throw new Error(
      `Can't delete this church — it still has ${blockers.join(
        ', '
      )} attached. Delete/reassign the livestreams, events, and videos first. For a linked editor account, run in Supabase SQL Editor: update profiles set role = 'viewer', church_id = null where church_id = '${id}';`
    );
  }

  const { error } = await supabase.from('churches').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete church:', error);
    throw new Error(`Failed to delete church: ${error.message}`);
  }

  revalidatePath('/admin/churches');
  revalidatePath('/churches');
}
