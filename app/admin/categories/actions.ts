'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function addCategory(formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  const supabase = createClient();

  if (!name) {
    redirect(`/admin/categories?error=${encodeURIComponent('Enter a category name.')}`);
  }

  // `categories.name` has a unique constraint — surface that as a normal
  // message rather than a raw constraint-violation error.
  const { error } = await supabase.from('categories').insert({ name });
  if (error) {
    const message = error.code === '23505' ? `"${name}" already exists.` : `Failed to add category: ${error.message}`;
    redirect(`/admin/categories?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/admin/categories');
  revalidatePath('/admin/videos/edit');
  revalidatePath('/videos');
  redirect('/admin/categories');
}

export async function renameCategory(formData: FormData) {
  const id = formData.get('id') as string;
  const name = (formData.get('name') as string)?.trim();
  const supabase = createClient();

  if (!name) {
    redirect(`/admin/categories?error=${encodeURIComponent('Category name cannot be empty.')}`);
  }

  const { error } = await supabase.from('categories').update({ name }).eq('id', id);
  if (error) {
    const message = error.code === '23505' ? `"${name}" already exists.` : `Failed to rename category: ${error.message}`;
    redirect(`/admin/categories?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/admin/categories');
  revalidatePath('/admin/videos/edit');
  revalidatePath('/videos');
  redirect('/admin/categories');
}

export async function deleteCategory(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();

  // video_categories.category_id has `on delete cascade`, so this also
  // silently untags any videos currently filed under it — no dependent-
  // record blocker needed here, unlike deleteChurch/deleteMinistry/deleteEvent.
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) {
    redirect(`/admin/categories?error=${encodeURIComponent(`Failed to delete category: ${error.message}`)}`);
  }

  revalidatePath('/admin/categories');
  revalidatePath('/admin/videos/edit');
  revalidatePath('/videos');
  redirect('/admin/categories');
}
