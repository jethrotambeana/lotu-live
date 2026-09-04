'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';

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
    .select('id, slug')
    .single();

  if (churchError || !newChurch) {
    console.error('Failed to create church from submission:', churchError);
    throw new Error(`Failed to approve submission: ${churchError?.message}`);
  }

  // Flag a matching account for editor activation, if one already exists.
  // Every signup gets a profiles row automatically (see the
  // handle_new_user trigger) with role 'viewer' by default, so this works
  // whether they signed up before or after submitting. Landing them in
  // 'pending_editor' (not straight to 'editor') means an admin still has
  // to explicitly click Activate — see activateEditor below — rather than
  // an email match alone granting access. Never overwrites someone who's
  // already an admin, already editing a different church, or already
  // pending/active elsewhere, since that could be a coincidental email
  // match rather than the actual submitter.
  const submissionEmail = submission.email?.trim();
  if (submissionEmail) {
    const { data: matchedProfile, error: lookupError } = await supabase
      .from('profiles')
      .select('id, role, church_id, email')
      .ilike('email', submissionEmail)
      .maybeSingle();

    if (lookupError) {
      console.error('Editor match: profile lookup failed:', lookupError);
    } else if (!matchedProfile) {
      console.log(`Editor match: no profile found matching email "${submissionEmail}".`);
    } else if (matchedProfile.role !== 'viewer' || matchedProfile.church_id) {
      console.log(
        `Editor match: skipped for "${submissionEmail}" — role is "${matchedProfile.role}", church_id is ${matchedProfile.church_id}. Only plain 'viewer' accounts with no existing church are matched.`
      );
    } else {
      const { error: linkError } = await supabase
        .from('profiles')
        .update({ role: 'pending_editor', church_id: newChurch.id })
        .eq('id', matchedProfile.id);
      if (linkError) {
        console.error('Editor match: update failed:', linkError);
        // Non-fatal — the church was still created successfully; an admin
        // can link the editor manually via SQL if this step fails.
      } else {
        console.log(`Editor match: "${submissionEmail}" flagged pending activation for church ${newChurch.id}.`);
      }
    }
  }

  await supabase.from('submissions').update({ status: 'approved' }).eq('id', id);

  if (submission.email) {
    await sendEmail({
      to: submission.email,
      subject: 'Your church is now listed on LOTU.LIVE',
      text: `Hi ${submission.contact_name || 'there'},

Good news — ${submission.church_name} has been approved and is now listed on LOTU.LIVE.

You can see your church's page here: https://lotu.live/church/${newChurch.slug}

Want to manage your church's page yourself? Create an account using this same email address at lotu.live/signup. Once your account is set up, one of our admins will activate it — after that, you'll be able to log in and manage your church's profile, add events, and upload videos.

We'll be in touch separately about setting up a livestream if you're planning to broadcast your services.

— The LOTU.LIVE Team`,
    });
  }

  revalidatePath('/admin/submissions');
  revalidatePath('/churches');
}

export async function rejectSubmission(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();
  await supabase.from('submissions').update({ status: 'rejected' }).eq('id', id);
  revalidatePath('/admin/submissions');
}

export async function activateEditor(formData: FormData) {
  const profileId = formData.get('profileId') as string;
  const supabase = createClient();

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('email, church_id, churches(name)')
    .eq('id', profileId)
    .single();

  if (fetchError || !profile) {
    console.error('Failed to fetch pending editor profile:', fetchError);
    throw new Error('Could not find that pending editor request.');
  }

  const { error } = await supabase.from('profiles').update({ role: 'editor' }).eq('id', profileId);
  if (error) {
    console.error('Failed to activate editor:', error);
    throw new Error(`Failed to activate: ${error.message}`);
  }

  const churchName = (profile as any).churches?.name || 'your church';
  if (profile.email) {
    await sendEmail({
      to: profile.email,
      subject: 'Your LOTU.LIVE account is ready',
      text: `Hi there,

Your account for ${churchName} has been activated. You can now log in and manage your church's page.

Log in here: https://lotu.live/login

From your dashboard you can:
- Update your church's profile (contact info, description, worship times, logo)
- Add and edit events
- Add and edit videos

Note: new events and videos you add need a quick review before they go live on the public site — you'll see a "Pending Approval" label until that happens.

— The LOTU.LIVE Team`,
    });
  }

  revalidatePath('/admin/submissions');
}
