'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function approveSubmission(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();

  const { data: submission } = await supabase.from('submissions').select('*').eq('id', id).single();
  if (!submission) return;

  // Create the church record from the submission's details.
  await supabase.from('churches').insert({
    slug: slugify(submission.church_name) + '-' + id.slice(0, 6),
    name: submission.church_name,
    country_id: submission.country_id,
    island_province: submission.island_province,
    town: submission.location,
    phone: submission.phone,
    email: submission.email,
    website: submission.website,
    facebook: submission.facebook,
    youtube: submission.youtube,
  });

  await supabase.from('submissions').update({ status: 'approved' }).eq('id', id);

  revalidatePath('/admin/submissions');
  revalidatePath('/churches');
}

export async function rejectSubmission(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();
  await supabase.from('submissions').update({ status: 'rejected' }).eq('id', id);
  revalidatePath('/admin/submissions');
}
