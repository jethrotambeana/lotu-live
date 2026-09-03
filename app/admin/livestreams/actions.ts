'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isPlausibleProviderId, Provider } from '@/lib/embed';
import { deriveYouTubeThumbnail, deriveCloudflareThumbnail } from '@/lib/thumbnails';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Same auto-derivation approach used for the video catalogue's thumbnails.
// YouTube and Cloudflare Stream both expose a stable, predictable thumbnail
// URL for any given ID — no API key needed. Facebook and HLS don't have an
// equivalent, so those stay manual (admin pastes a Preview Image URL).
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

export async function saveLivestream(formData: FormData) {
  const id = formData.get('id') as string | null;
  const provider = formData.get('provider') as Provider;
  const providerStreamId = formData.get('provider_stream_id') as string;

  // Soft format check — logged only, never blocks saving. The real
  // security boundary is that the ID/URL is always URL-encoded when
  // building the embed (see lib/embed.ts), so it can't inject markup
  // even if the format looks unusual.
  if (!isPlausibleProviderId(provider, providerStreamId)) {
    console.warn(`Unusual stream ID format for provider "${provider}": ${providerStreamId}`);
  }

  const supabase = createClient();

  const manualPreviewImage = (formData.get('preview_image') as string) || null;
  const previewImage = manualPreviewImage || deriveLivestreamThumbnail(provider, providerStreamId);

  const record = {
    name: formData.get('name') as string,
    slug: (formData.get('slug') as string) || slugify(formData.get('name') as string),
    type: (formData.get('type') as string) || null,
    church_id: (formData.get('church_id') as string) || null,
    event_id: (formData.get('event_id') as string) || null,
    provider,
    provider_stream_id: providerStreamId,
    preview_image: previewImage,
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
