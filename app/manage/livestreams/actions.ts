'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isPlausibleProviderId, Provider } from '@/lib/embed';
import { deriveYouTubeThumbnail, deriveCloudflareThumbnail } from '@/lib/thumbnails';
import { requireChurchEditor } from '@/lib/requireChurchEditor';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function deriveLivestreamThumbnail(provider: Provider, providerStreamId: string): string | null {
  switch (provider) {
    case 'youtube':
      return deriveYouTubeThumbnail(providerStreamId);
    case 'cloudflare':
      return deriveCloudflareThumbnail(providerStreamId);
    default:
      return null;
  }
}

export async function saveMyLivestream(formData: FormData) {
  const { supabase, churchId } = await requireChurchEditor();

  const id = (formData.get('id') as string) || null;
  const provider = formData.get('provider') as Provider;
  const providerStreamId = formData.get('provider_stream_id') as string;

  if (!isPlausibleProviderId(provider, providerStreamId)) {
    console.warn(`Unusual stream ID format for provider "${provider}": ${providerStreamId}`);
  }

  const manualPreviewImage = (formData.get('preview_image') as string) || null;
  const previewImage = manualPreviewImage || deriveLivestreamThumbnail(provider, providerStreamId);

  // event_id must belong to this editor's own church — re-validated here
  // server-side rather than trusting the dropdown, since form values are
  // always attacker-controllable in principle.
  const requestedEventId = (formData.get('event_id') as string) || null;
  let eventId: string | null = null;
  if (requestedEventId) {
    const { data: ownEvent } = await supabase
      .from('events')
      .select('id')
      .eq('id', requestedEventId)
      .eq('host_church_id', churchId)
      .single();
    eventId = ownEvent?.id ?? null;
  }

  const record = {
    name: formData.get('name') as string,
    slug: (formData.get('slug') as string) || slugify(formData.get('name') as string),
    church_id: churchId, // always forced — never trust a client-supplied church_id
    event_id: eventId,
    provider,
    provider_stream_id: providerStreamId,
    preview_image: previewImage,
    island_province: (formData.get('island_province') as string) || null,
    location: (formData.get('location') as string) || null,
    language: (formData.get('language') as string) || null,
    start_at: (formData.get('start_at') as string) || null,
    end_at: (formData.get('end_at') as string) || null,
    visible: formData.get('visible') === 'on',
    status: (formData.get('status') as string) || 'offline',
  };

  let query;
  if (id) {
    query = supabase.from('livestreams').update(record).eq('id', id).eq('church_id', churchId);
  } else {
    query = supabase.from('livestreams').insert(record);
  }
  const { error } = await query;
  if (error) {
    console.error('Failed to save livestream (editor):', error);
    throw new Error(`Failed to save: ${error.message}`);
  }

  revalidatePath('/manage/livestreams');
  revalidatePath('/live');
  revalidatePath('/');
  redirect('/manage/livestreams');
}

export async function deleteMyLivestream(formData: FormData) {
  const { supabase, churchId } = await requireChurchEditor();
  const id = formData.get('id') as string;
  await supabase.from('livestreams').delete().eq('id', id).eq('church_id', churchId);
  revalidatePath('/manage/livestreams');
  revalidatePath('/live');
  revalidatePath('/');
}

export async function toggleMyVisible(formData: FormData) {
  const { supabase, churchId } = await requireChurchEditor();
  const id = formData.get('id') as string;
  const visible = formData.get('visible') === 'true';
  await supabase.from('livestreams').update({ visible: !visible }).eq('id', id).eq('church_id', churchId);
  revalidatePath('/manage/livestreams');
  revalidatePath('/live');
  revalidatePath('/');
}
