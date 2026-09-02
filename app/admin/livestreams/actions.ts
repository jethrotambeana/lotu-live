'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isPlausibleProviderId, Provider } from '@/lib/embed';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function saveLivestream(formData: FormData) {
  const id = formData.get('id') as string | null;
  const provider = formData.get('provider') as Provider;
  const providerStreamId = formData.get('provider_stream_id') as string;

  // Server-side validation — this is the actual security boundary from
  // §14 of the concept doc: only a provider + its own ID/URL is ever
  // accepted, never arbitrary embed HTML.
  if (!isPlausibleProviderId(provider, providerStreamId)) {
    throw new Error(
      `The stream ID/URL doesn't look right for provider "${provider}". Check the format and try again.`
    );
  }

  const supabase = createClient();

  const record = {
    name: formData.get('name') as string,
    slug: (formData.get('slug') as string) || slugify(formData.get('name') as string),
    type: (formData.get('type') as string) || null,
    church_id: (formData.get('church_id') as string) || null,
    event_id: (formData.get('event_id') as string) || null,
    provider,
    provider_stream_id: providerStreamId,
    preview_image: (formData.get('preview_image') as string) || null,
    country_id: (formData.get('country_id') as string) || null,
    island_province: (formData.get('island_province') as string) || null,
    location: (formData.get('location') as string) || null,
    language: (formData.get('language') as string) || null,
    start_at: (formData.get('start_at') as string) || null,
    end_at: (formData.get('end_at') as string) || null,
    featured: formData.get('featured') === 'on',
    visible: formData.get('visible') === 'on',
    status: (formData.get('status') as string) || 'offline',
  };

  if (id) {
    await supabase.from('livestreams').update(record).eq('id', id);
  } else {
    await supabase.from('livestreams').insert(record);
  }

  revalidatePath('/admin/livestreams');
  revalidatePath('/live');
  revalidatePath('/');
  redirect('/admin/livestreams');
}

export async function deleteLivestream(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();
  await supabase.from('livestreams').delete().eq('id', id);
  revalidatePath('/admin/livestreams');
  revalidatePath('/live');
  revalidatePath('/');
}

export async function toggleVisible(formData: FormData) {
  const id = formData.get('id') as string;
  const visible = formData.get('visible') === 'true';
  const supabase = createClient();
  await supabase.from('livestreams').update({ visible: !visible }).eq('id', id);
  revalidatePath('/admin/livestreams');
  revalidatePath('/live');
  revalidatePath('/');
}
