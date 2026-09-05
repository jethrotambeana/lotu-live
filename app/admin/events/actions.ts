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
    host_church_id: (formData.get('host_church_id') as string) || null,
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
    approved: formData.get('approved') === 'on',
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

  // events is referenced by livestreams.event_id and videos.event_id with
  // no ON DELETE cascade, so Postgres blocks the delete outright if either
  // still points at it. Check first and give a specific, actionable
  // message rather than a raw FK-violation error — or worse, silently
  // doing nothing (see the same fix already applied to deleteChurch).
  const [{ count: livestreamCount }, { count: videoCount }] = await Promise.all([
    supabase.from('livestreams').select('id', { count: 'exact', head: true }).eq('event_id', id),
    supabase.from('videos').select('id', { count: 'exact', head: true }).eq('event_id', id),
  ]);

  const blockers: string[] = [];
  if (livestreamCount) blockers.push(`${livestreamCount} livestream${livestreamCount === 1 ? '' : 's'}`);
  if (videoCount) blockers.push(`${videoCount} video${videoCount === 1 ? '' : 's'}`);

  if (blockers.length > 0) {
    const message = `Can't delete this event — it still has ${blockers.join(
      ', '
    )} linked to it. Unlink or delete those first (edit each one and clear its Event field, or delete it under Admin → Livestreams / Admin → Videos).`;
    // redirect() (unlike throw new Error()) is NOT swallowed by Next's
    // production error handling — it's how the message actually reaches
    // the admin instead of a generic "Application error" page.
    redirect(`/admin/events?error=${encodeURIComponent(message)}`);
  }

  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete event:', error);
    redirect(`/admin/events?error=${encodeURIComponent(`Failed to delete event: ${error.message}`)}`);
  }

  revalidatePath('/admin/events');
  revalidatePath('/events');
}

export async function toggleEventApproved(formData: FormData) {
  const id = formData.get('id') as string;
  const approved = formData.get('approved') === 'true';
  const supabase = createClient();
  await supabase.from('events').update({ approved: !approved }).eq('id', id);
  revalidatePath('/admin/events');
  revalidatePath('/events');
}
