'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendEmail } from '@/lib/email';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function saveMinistry(formData: FormData) {
  const id = formData.get('id') as string | null;
  const supabase = createClient();

  const record = {
    name: formData.get('name') as string,
    slug: (formData.get('slug') as string) || slugify(formData.get('name') as string),
    type: (formData.get('type') as string) || 'other',
    church_id: (formData.get('church_id') as string) || null,
    logo_url: (formData.get('logo_url') as string) || null,
    country_id: (formData.get('country_id') as string) || null,
    island_province: (formData.get('island_province') as string) || null,
    town: (formData.get('town') as string) || null,
    phone: (formData.get('phone') as string) || null,
    email: (formData.get('email') as string) || null,
    website: (formData.get('website') as string) || null,
    facebook: (formData.get('facebook') as string) || null,
    youtube: (formData.get('youtube') as string) || null,
    description: (formData.get('description') as string) || null,
    approved: formData.get('approved') === 'on',
    active: formData.get('active') === 'on',
  };

  if (id) {
    const { error } = await supabase.from('ministries').update(record).eq('id', id);
    if (error) {
      console.error('Failed to update ministry:', error);
      throw new Error(`Failed to save: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from('ministries').insert(record);
    if (error) {
      console.error('Failed to create ministry:', error);
      throw new Error(`Failed to save: ${error.message}`);
    }
  }

  revalidatePath('/admin/ministries');
  revalidatePath('/ministries');
  redirect('/admin/ministries');
}

// Quick Active/Inactive toggle from the list page — same one-click pattern
// as the Livestreams Show/Hide toggle and the churches list. Deliberately
// a separate column from `approved` (which governs the original
// submission-review gate and isn't touched here). Setting active = false
// immediately hides the ministry, and (via the cascading RLS policies) its
// events, videos, and livestreams too, without touching any of their own
// approved/visible flags — flipping active back on restores everything
// exactly as it was.
export async function toggleMinistryActive(formData: FormData) {
  const id = formData.get('id') as string;
  const active = formData.get('active') === 'true';
  const supabase = createClient();

  const { error } = await supabase.from('ministries').update({ active }).eq('id', id);
  if (error) {
    console.error('Failed to toggle ministry active state:', error);
    redirect(`/admin/ministries?error=${encodeURIComponent(`Failed to update status: ${error.message}`)}`);
  }

  revalidatePath('/admin/ministries');
  revalidatePath('/ministries');
  redirect('/admin/ministries');
}

export async function deleteMinistry(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();

  // Same dependent-record check pattern as deleteChurch — ministries is
  // referenced by videos.ministry_id, events.host_ministry_id, and
  // profiles.ministry_id with no cascade.
  const [{ count: videoCount }, { count: eventCount }, { count: editorCount }] = await Promise.all([
    supabase.from('videos').select('id', { count: 'exact', head: true }).eq('ministry_id', id),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('host_ministry_id', id),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('ministry_id', id),
  ]);

  const blockers: string[] = [];
  if (videoCount) blockers.push(`${videoCount} video${videoCount === 1 ? '' : 's'}`);
  if (eventCount) blockers.push(`${eventCount} event${eventCount === 1 ? '' : 's'}`);
  if (editorCount) blockers.push(`${editorCount} linked editor account${editorCount === 1 ? '' : 's'}`);

  if (blockers.length > 0) {
    const message = `Can't delete this ministry — it still has ${blockers.join(
      ', '
    )} attached. Delete/reassign the events and videos first.${
      editorCount ? ' You can unlink the editor account below.' : ''
    }`;
    redirect(`/admin/ministries?error=${encodeURIComponent(message)}&blockedId=${id}`);
  }

  const { error } = await supabase.from('ministries').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete ministry:', error);
    redirect(`/admin/ministries?error=${encodeURIComponent(`Failed to delete ministry: ${error.message}`)}`);
  }

  revalidatePath('/admin/ministries');
  revalidatePath('/ministries');
}

export async function unlinkMinistryEditors(formData: FormData) {
  const ministryId = formData.get('ministryId') as string;
  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ role: 'viewer', ministry_id: null })
    .eq('ministry_id', ministryId);

  if (error) {
    console.error('Failed to unlink ministry editors:', error);
    redirect(`/admin/ministries?error=${encodeURIComponent(`Failed to unlink editor: ${error.message}`)}`);
  }

  revalidatePath('/admin/ministries');
  redirect('/admin/ministries');
}

// Same unlink as above, but reachable directly from the ministry's own edit
// page (not just the delete-blocked banner) and redirects back there — the
// normal path for routine staff turnover, not just cleanup before a delete.
export async function unlinkMinistryEditorFromEdit(formData: FormData) {
  const profileId = formData.get('profileId') as string;
  const ministryId = formData.get('ministryId') as string;
  const supabase = createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'viewer', ministry_id: null })
    .eq('id', profileId);

  if (error) {
    console.error('Failed to unlink ministry editor:', error);
    redirect(
      `/admin/ministries/edit?id=${ministryId}&error=${encodeURIComponent(`Failed to unlink editor: ${error.message}`)}`
    );
  }

  revalidatePath('/admin/ministries');
  redirect(`/admin/ministries/edit?id=${ministryId}`);
}

// Directly grants editor access to an existing account by email — the UI
// equivalent of the manual SQL update documented in the Admin Guide. Skips
// the pending_editor step entirely, since the admin typing this email in
// and clicking the button IS the deliberate confirmation that activation
// would otherwise require.
export async function grantMinistryEditor(formData: FormData) {
  const ministryId = formData.get('ministryId') as string;
  const email = (formData.get('email') as string)?.trim();
  const supabase = createClient();

  if (!email) {
    redirect(`/admin/ministries/edit?id=${ministryId}&error=${encodeURIComponent('Enter an email address.')}`);
  }

  const { data: profile, error: lookupError } = await supabase
    .from('profiles')
    .select('id, email, role, church_id, ministry_id')
    .ilike('email', email)
    .maybeSingle();

  if (lookupError) {
    console.error('Grant ministry editor: lookup failed:', lookupError);
    redirect(`/admin/ministries/edit?id=${ministryId}&error=${encodeURIComponent('Lookup failed — try again.')}`);
  }

  if (!profile) {
    redirect(
      `/admin/ministries/edit?id=${ministryId}&error=${encodeURIComponent(
        `No account found for "${email}" — ask them to sign up at /signup first, then try again.`
      )}`
    );
  }

  if (profile!.role === 'admin') {
    redirect(
      `/admin/ministries/edit?id=${ministryId}&error=${encodeURIComponent(
        `"${email}" is an admin account — can't also make it a ministry editor.`
      )}`
    );
  }

  if ((profile!.ministry_id && profile!.ministry_id !== ministryId) || profile!.church_id) {
    redirect(
      `/admin/ministries/edit?id=${ministryId}&error=${encodeURIComponent(
        `"${email}" already has editor access elsewhere — unlink it there first.`
      )}`
    );
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'editor', ministry_id: ministryId, church_id: null })
    .eq('id', profile!.id);

  if (error) {
    console.error('Failed to grant ministry editor access:', error);
    redirect(
      `/admin/ministries/edit?id=${ministryId}&error=${encodeURIComponent(`Failed to grant access: ${error.message}`)}`
    );
  }

  const { data: ministry } = await supabase.from('ministries').select('name').eq('id', ministryId).single();
  if (profile!.email) {
    await sendEmail({
      to: profile!.email,
      subject: 'Your LOTU.LIVE account is ready',
      text: `Hi there,

Your account for ${ministry?.name || 'your ministry'} has been activated. You can now log in and manage its page.

Log in here: https://lotu.live/login

From your dashboard you can:
- Update your ministry profile (contact info, description, logo)
- Add and edit events
- Add and edit videos

Note: new events and videos you add need a quick review before they go live on the public site — you'll see a "Pending Approval" label until that happens.

— The LOTU.LIVE Team`,
    });
  }

  revalidatePath('/admin/ministries');
  redirect(`/admin/ministries/edit?id=${ministryId}`);
}
