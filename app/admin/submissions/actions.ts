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

// Shared by both church and ministry approval: flags a matching account
// for editor activation if one already exists, without ever overwriting
// someone who's already an admin, already editing something else, or
// already pending elsewhere.
async function matchEditorCandidate(
  supabase: ReturnType<typeof createClient>,
  email: string | null | undefined,
  scope: { type: 'church' | 'ministry'; id: string }
) {
  const trimmedEmail = email?.trim();
  if (!trimmedEmail) return;

  const { data: matchedProfile, error: lookupError } = await supabase
    .from('profiles')
    .select('id, role, church_id, ministry_id, email')
    .ilike('email', trimmedEmail)
    .maybeSingle();

  if (lookupError) {
    console.error('Editor match: profile lookup failed:', lookupError);
    return;
  }
  if (!matchedProfile) {
    console.log(`Editor match: no profile found matching email "${trimmedEmail}".`);
    return;
  }
  if (matchedProfile.role !== 'viewer' || matchedProfile.church_id || matchedProfile.ministry_id) {
    console.log(
      `Editor match: skipped for "${trimmedEmail}" — role is "${matchedProfile.role}", church_id is ${matchedProfile.church_id}, ministry_id is ${matchedProfile.ministry_id}.`
    );
    return;
  }

  const update =
    scope.type === 'church'
      ? { role: 'pending_editor', church_id: scope.id }
      : { role: 'pending_editor', ministry_id: scope.id };

  const { error: linkError } = await supabase.from('profiles').update(update).eq('id', matchedProfile.id);
  if (linkError) {
    console.error('Editor match: update failed:', linkError);
  } else {
    console.log(`Editor match: "${trimmedEmail}" flagged pending activation for ${scope.type} ${scope.id}.`);
  }
}

export async function approveSubmission(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();

  const { data: submission } = await supabase.from('submissions').select('*').eq('id', id).single();
  if (!submission) return;

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

  await matchEditorCandidate(supabase, submission.email, { type: 'church', id: newChurch.id });
  await supabase
    .from('submissions')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', id);

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
  await supabase
    .from('submissions')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', id);
  revalidatePath('/admin/submissions');
}

export async function approveEventSubmission(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();

  const { data: submission } = await supabase.from('event_submissions').select('*').eq('id', id).single();
  if (!submission) return;

  // Admin's own review of this submission IS the approval step, so the
  // resulting event goes straight to approved — unlike editor-submitted
  // events via /manage, which always start pending regardless.
  const { error: eventError } = await supabase.from('events').insert({
    slug: slugify(submission.event_name) + '-' + id.slice(0, 6),
    name: submission.event_name,
    hosted_by: submission.hosted_by,
    host_church_id: submission.host_church_id,
    host_ministry_id: submission.host_ministry_id,
    country_id: submission.country_id,
    island_province: submission.island_province,
    venue: submission.venue,
    town: submission.town,
    start_date: submission.start_date,
    end_date: submission.end_date,
    start_time: submission.start_time,
    end_time: submission.end_time,
    description: submission.description,
    website: submission.website,
    facebook: submission.facebook,
    youtube: submission.youtube,
    poster_url: submission.poster_url,
    status: 'upcoming',
    approved: true,
  });

  if (eventError) {
    console.error('Failed to create event from submission:', eventError);
    throw new Error(`Failed to approve submission: ${eventError.message}`);
  }

  await supabase
    .from('event_submissions')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (submission.email) {
    await sendEmail({
      to: submission.email,
      subject: 'Your event is now listed on LOTU.LIVE',
      text: `Hi ${submission.contact_name || 'there'},

Good news — ${submission.event_name} has been approved and is now listed on LOTU.LIVE's events page.

— The LOTU.LIVE Team`,
    });
  }

  revalidatePath('/admin/submissions');
  revalidatePath('/events');
}

export async function rejectEventSubmission(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();
  await supabase
    .from('event_submissions')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', id);
  revalidatePath('/admin/submissions');
}

export async function approveMinistrySubmission(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();

  const { data: submission } = await supabase.from('ministry_submissions').select('*').eq('id', id).single();
  if (!submission) return;

  const { data: newMinistry, error: ministryError } = await supabase
    .from('ministries')
    .insert({
      slug: slugify(submission.ministry_name) + '-' + id.slice(0, 6),
      name: submission.ministry_name,
      type: submission.type,
      church_id: submission.church_id,
      country_id: submission.country_id,
      island_province: submission.island_province,
      town: submission.town,
      description: submission.description,
      email: submission.email,
      phone: submission.phone,
      website: submission.website,
      facebook: submission.facebook,
      youtube: submission.youtube,
    })
    .select('id, slug')
    .single();

  if (ministryError || !newMinistry) {
    console.error('Failed to create ministry from submission:', ministryError);
    throw new Error(`Failed to approve submission: ${ministryError?.message}`);
  }

  await matchEditorCandidate(supabase, submission.email, { type: 'ministry', id: newMinistry.id });
  await supabase
    .from('ministry_submissions')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (submission.email) {
    await sendEmail({
      to: submission.email,
      subject: 'Your ministry is now listed on LOTU.LIVE',
      text: `Hi ${submission.contact_name || 'there'},

Good news — ${submission.ministry_name} has been approved and is now listed on LOTU.LIVE.

You can see its page here: https://lotu.live/ministry/${newMinistry.slug}

Want to manage this page yourself? Create an account using this same email address at lotu.live/signup. Once your account is set up, one of our admins will activate it — after that, you'll be able to log in and manage your ministry's profile, add events, and upload videos.

— The LOTU.LIVE Team`,
    });
  }

  revalidatePath('/admin/submissions');
  revalidatePath('/ministries');
}

export async function rejectMinistrySubmission(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();
  await supabase
    .from('ministry_submissions')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', id);
  revalidatePath('/admin/submissions');
}

export async function activateEditor(formData: FormData) {
  const profileId = formData.get('profileId') as string;
  const supabase = createClient();

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('email, church_id, ministry_id, churches(name), ministries(name)')
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

  const isMinistry = !!profile.ministry_id;
  const orgName = isMinistry
    ? (profile as any).ministries?.name || 'your ministry'
    : (profile as any).churches?.name || 'your church';
  const orgLabel = isMinistry ? 'ministry' : "church's";

  if (profile.email) {
    await sendEmail({
      to: profile.email,
      subject: 'Your LOTU.LIVE account is ready',
      text: `Hi there,

Your account for ${orgName} has been activated. You can now log in and manage its page.

Log in here: https://lotu.live/login

From your dashboard you can:
- Update your ${orgLabel} profile (contact info, description, logo)
- Add and edit events
- Add and edit videos

Note: new events and videos you add need a quick review before they go live on the public site — you'll see a "Pending Approval" label until that happens.

— The LOTU.LIVE Team`,
    });
  }

  revalidatePath('/admin/submissions');
}
