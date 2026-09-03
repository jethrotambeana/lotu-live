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
  const { data: newChurch, error: churchError } = await supabase
    .from('churches')
    .insert({
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
    })
    .select('id')
    .single();

  if (churchError || !newChurch) {
    console.error('Failed to create church from submission:', churchError);
    throw new Error(`Failed to approve submission: ${churchError?.message}`);
  }

  // Auto-link the submitter as this church's editor, if an account with a
  // matching email already exists. Every signup gets a profiles row
  // automatically (see the handle_new_user trigger) with role 'viewer', so
  // this works whether they signed up before or after submitting. Only
  // upgrades a plain 'viewer' — never silently overwrites someone who's
  // already an admin or already editing a different church, since that
  // could be a coincidental email match rather than the actual submitter.
  const submissionEmail = submission.email?.trim();
  if (submissionEmail) {
    const { data: matchedProfile, error: lookupError } = await supabase
      .from('profiles')
      .select('id, role, church_id, email')
      .ilike('email', submissionEmail)
      .maybeSingle();

    if (lookupError) {
      console.error('Editor auto-link: profile lookup failed:', lookupError);
    } else if (!matchedProfile) {
      console.log(`Editor auto-link: no profile found matching email "${submissionEmail}".`);
    } else if (matchedProfile.role !== 'viewer' || matchedProfile.church_id) {
      console.log(
        `Editor auto-link: skipped for "${submissionEmail}" — role is "${matchedProfile.role}", church_id is ${matchedProfile.church_id}. Only plain 'viewer' accounts with no existing church are auto-linked.`
      );
    } else {
      const { error: linkError } = await supabase
        .from('profiles')
        .update({ role: 'editor', church_id: newChurch.id })
        .eq('id', matchedProfile.id);
      if (linkError) {
        console.error('Editor auto-link: update failed:', linkError);
        // Non-fatal — the church was still created successfully; an admin
        // can link the editor manually via SQL if this step fails.
      } else {
        console.log(`Editor auto-link: linked "${submissionEmail}" to church ${newChurch.id}.`);
      }
    }
  }

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
