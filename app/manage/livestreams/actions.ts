'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireEditor } from '@/lib/requireEditor';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Only ever writes this specific safe subset — deliberately NOT provider,
// provider_stream_id, visible, status, featured*, church_id, ministry_id,
// event_id, type, country_id, or island_province, regardless of what a
// crafted request might include in formData. This object is the actual
// enforcement point for "editors can't change their stream source or make
// it visible" — RLS grants row-level access, but only this code decides
// which columns of that row ever get touched from this action.
export async function saveLivestreamDetails(formData: FormData) {
  await requireEditor(); // confirms the caller is a real, active editor session

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const supabase = createClient();

  const record = {
    name,
    slug: (formData.get('slug') as string) || slugify(name),
    preview_image: (formData.get('preview_image') as string) || null,
    location: (formData.get('location') as string) || null,
    language: (formData.get('language') as string) || null,
    category_id: (formData.get('category_id') as string) || null,
    start_at: (formData.get('start_at') as string) || null,
    end_at: (formData.get('end_at') as string) || null,
  };

  // RLS (editor manage own livestreams / editor manage own ministry
  // livestreams) enforces that this update can only ever affect a
  // livestream belonging to the caller's own church or ministry.
  const { error } = await supabase.from('livestreams').update(record).eq('id', id);
  if (error) {
    redirect(`/manage/livestreams/edit?id=${id}&error=${encodeURIComponent(`Failed to save: ${error.message}`)}`);
  }

  revalidatePath('/manage/livestreams');
  revalidatePath(`/manage/livestreams/edit?id=${id}`);
  revalidatePath('/live');
  revalidatePath('/');
  redirect(`/manage/livestreams/edit?id=${id}&saved=1`);
}

export async function addScheduleSlot(formData: FormData) {
  await requireEditor();

  const livestreamId = formData.get('livestreamId') as string;
  const dayOfWeek = parseInt(formData.get('dayOfWeek') as string, 10);
  const startTime = formData.get('startTime') as string;
  const supabase = createClient();

  const { error } = await supabase
    .from('stream_schedules')
    .insert({ livestream_id: livestreamId, day_of_week: dayOfWeek, start_time: startTime });
  if (error) {
    redirect(
      `/manage/livestreams/edit?id=${livestreamId}&error=${encodeURIComponent(`Failed to add time: ${error.message}`)}`
    );
  }

  revalidatePath(`/manage/livestreams/edit?id=${livestreamId}`);
  revalidatePath('/church');
  revalidatePath('/ministry');
  redirect(`/manage/livestreams/edit?id=${livestreamId}`);
}

// Saves every existing schedule slot's day/time in one submit, and removes
// any row whose "Remove" checkbox was checked — same bulk-save-plus-remove
// pattern as the Series episode reorder tool in Admin.
export async function saveScheduleSlots(formData: FormData) {
  await requireEditor();

  const livestreamId = formData.get('livestreamId') as string;
  const ids = formData.getAll('scheduleId') as string[];
  const days = formData.getAll('dayOfWeek') as string[];
  const times = formData.getAll('startTime') as string[];
  const removeIds = new Set(formData.getAll('remove') as string[]);

  const supabase = createClient();

  await Promise.all(
    ids.map((id, i) => {
      if (removeIds.has(id)) {
        return supabase.from('stream_schedules').delete().eq('id', id);
      }
      return supabase
        .from('stream_schedules')
        .update({ day_of_week: parseInt(days[i], 10), start_time: times[i] })
        .eq('id', id);
    })
  );

  revalidatePath(`/manage/livestreams/edit?id=${livestreamId}`);
  revalidatePath('/church');
  revalidatePath('/ministry');
  redirect(`/manage/livestreams/edit?id=${livestreamId}`);
}
