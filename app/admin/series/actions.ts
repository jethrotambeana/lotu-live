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

export async function saveSeries(formData: FormData) {
  const id = formData.get('id') as string | null;
  const supabase = createClient();

  const record = {
    name: formData.get('name') as string,
    slug: (formData.get('slug') as string) || slugify(formData.get('name') as string),
    description: (formData.get('description') as string) || null,
    cover_image: (formData.get('cover_image') as string) || null,
  };

  if (id) {
    const { error } = await supabase.from('series').update(record).eq('id', id);
    if (error) {
      redirect(`/admin/series/edit?id=${id}&error=${encodeURIComponent(`Failed to save: ${error.message}`)}`);
    }
  } else {
    const { error } = await supabase.from('series').insert(record);
    if (error) {
      redirect(`/admin/series/edit?error=${encodeURIComponent(`Failed to save: ${error.message}`)}`);
    }
  }

  revalidatePath('/admin/series');
  revalidatePath('/admin/videos/edit');
  revalidatePath('/videos');
  redirect('/admin/series');
}

export async function deleteSeries(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();

  // videos.series_id has `on delete set null` — this unfiles any videos
  // currently in the series rather than deleting them or blocking, so no
  // dependent-record check is needed here (unlike deleteChurch/deleteEvent).
  const { error } = await supabase.from('series').delete().eq('id', id);
  if (error) {
    redirect(`/admin/series?error=${encodeURIComponent(`Failed to delete series: ${error.message}`)}`);
  }

  revalidatePath('/admin/series');
  revalidatePath('/admin/videos/edit');
  revalidatePath('/videos');
  redirect('/admin/series');
}

// Saves every episode's number in one submit — the reorder tool on the
// series edit page renders one number input per video and posts them all
// together, rather than requiring a separate save click per video.
export async function saveEpisodeOrder(formData: FormData) {
  const seriesId = formData.get('seriesId') as string;
  const videoIds = formData.getAll('videoId') as string[];
  const episodeNumbers = formData.getAll('episodeNumber') as string[];
  const supabase = createClient();

  await Promise.all(
    videoIds.map((videoId, i) => {
      const raw = episodeNumbers[i];
      const episode_number = raw && raw.trim() !== '' ? parseInt(raw, 10) : null;
      return supabase.from('videos').update({ episode_number }).eq('id', videoId);
    })
  );

  revalidatePath(`/admin/series/edit?id=${seriesId}`);
  revalidatePath('/videos');
  redirect(`/admin/series/edit?id=${seriesId}`);
}
