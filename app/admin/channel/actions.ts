'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

export async function addToPlaylist(formData: FormData) {
  const videoId = formData.get('video_id') as string;
  const supabase = createClient();

  const { data: maxRow } = await supabase
    .from('channel_playlist')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = (maxRow?.position ?? 0) + 1;

  await supabase.from('channel_playlist').insert({ video_id: videoId, position: nextPosition });

  revalidatePath('/admin/channel');
  revalidatePath('/channel');
}

export async function removeFromPlaylist(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();
  await supabase.from('channel_playlist').delete().eq('id', id);
  revalidatePath('/admin/channel');
  revalidatePath('/channel');
}

// Swaps this row's position with its immediate neighbor in the current
// order, found by re-reading the full ordered list rather than assuming
// positions are contiguous integers — keeps this correct even if past
// inserts/removals ever left gaps.
export async function movePlaylistItem(formData: FormData) {
  const id = formData.get('id') as string;
  const direction = formData.get('direction') as 'up' | 'down';
  const supabase = createClient();

  const { data: rows } = await supabase
    .from('channel_playlist')
    .select('id, position')
    .order('position', { ascending: true });

  if (!rows) return;
  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return;

  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= rows.length) return; // already at an end

  const current = rows[index];
  const neighbor = rows[swapIndex];

  await Promise.all([
    supabase.from('channel_playlist').update({ position: neighbor.position }).eq('id', current.id),
    supabase.from('channel_playlist').update({ position: current.position }).eq('id', neighbor.id),
  ]);

  revalidatePath('/admin/channel');
  revalidatePath('/channel');
}

export async function playVideoNow(formData: FormData) {
  const videoId = formData.get('video_id') as string;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from('channel_override')
    .update({ video_id: videoId, started_at: new Date().toISOString(), set_by: user?.id ?? null })
    .eq('id', 1);

  revalidatePath('/admin/channel');
  revalidatePath('/channel');
}

export async function clearOverride() {
  const supabase = createClient();
  await supabase.from('channel_override').update({ video_id: null }).eq('id', 1);
  revalidatePath('/admin/channel');
  revalidatePath('/channel');
}
