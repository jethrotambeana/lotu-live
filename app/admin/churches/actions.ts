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

export async function saveChurch(formData: FormData) {
  const id = formData.get('id') as string | null;
  const supabase = createClient();

  const record = {
    name: formData.get('name') as string,
    slug: (formData.get('slug') as string) || slugify(formData.get('name') as string),
    logo_url: (formData.get('logo_url') as string) || null,
    country_id: (formData.get('country_id') as string) || null,
    island_province: (formData.get('island_province') as string) || null,
    town: (formData.get('town') as string) || null,
    address: (formData.get('address') as string) || null,
    phone: (formData.get('phone') as string) || null,
    email: (formData.get('email') as string) || null,
    website: (formData.get('website') as string) || null,
    facebook: (formData.get('facebook') as string) || null,
    youtube: (formData.get('youtube') as string) || null,
    description: (formData.get('description') as string) || null,
    worship_times: (formData.get('worship_times') as string) || null,
    active: formData.get('active') === 'on',
  };

  if (id) {
    const { error } = await supabase.from('churches').update(record).eq('id', id);
    if (error) {
      console.error('Failed to update church:', error);
      throw new Error(`Failed to save church: ${error.message}`);
    }
  } else {
    const { error } = await supabase.from('churches').insert(record);
    if (error) {
      console.error('Failed to create church:', error);
      throw new Error(`Failed to save church: ${error.message}`);
    }
  }

  revalidatePath('/admin/churches');
  revalidatePath('/churches');
  redirect('/admin/churches');
}

// Quick Active/Inactive toggle from the list page — same one-click pattern
// as the Livestreams Show/Hide toggle. Setting active = false immediately
// hides the church, and (via the cascading RLS policies) its events,
// videos, and livestreams too, without touching any of their own
// approved/visible flags — flipping active back on restores everything
// exactly as it was.
export async function toggleChurchActive(formData: FormData) {
  const id = formData.get('id') as string;
  const active = formData.get('active') === 'true';
  const supabase = createClient();

  const { error } = await supabase.from('churches').update({ active }).eq('id', id);
  if (error) {
    console.error('Failed to toggle church active state:', error);
    redirect(`/admin/churches?error=${encodeURIComponent(`Failed to update status: ${error.message}`)}`);
  }

  revalidatePath('/admin/churches');
  revalidatePath('/churches');
  redirect('/admin/churches');
}

export async function deleteChurch(formData: FormData) {
  const id = formData.get('id') as string;
  const supabase = createClient();

  // Churches are referenced by livestreams, events, videos, and profiles
  // (an editor's church_id) with no ON DELETE cascade, so Postgres blocks
  // the delete outright if any of these still point at it. Check first
  // and give a specific, actionable message rather than a raw FK-violation
  // error — or worse, silently doing nothing.
  const [{ count: livestreamCount }, { count: eventCount }, { count: videoCount }, { count: editorCount }] =
    await Promise.all([
      supabase.from('livestreams').select('id', { count: 'exact', head: true }).eq('church_id', id),
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('host_church_id', id),
      supabase.from('videos').select('id', { count: 'exact', head: true }).eq('church_id', id),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('church_id', id),
    ]);

  const blockers: string[] = [];
  if (livestreamCount) blockers.push(`${livestreamCount} livestream${livestreamCount === 1 ? '' : 's'}`);
  if (eventCount) blockers.push(`${eventCount} event${eventCount === 1 ? '' : 's'}`);
  if (videoCount) blockers.push(`${videoCount} video${videoCount === 1 ? '' : 's'}`);
  if (editorCount) blockers.push(`${editorCount} linked editor account${editorCount === 1 ? '' : 's'}`);

  if (blockers.length > 0) {
    const message = `Can't delete this church — it still has ${blockers.join(
      ', '
    )} attached. Delete/reassign the livestreams, events, and videos first.${
      editorCount ? ' You can unlink the editor account below.' : ''
    }`;
    // redirect() (unlike throw new Error()) is NOT swallowed by Next's
    // production error handling — it's how the message actually reaches
    // the admin instead of a generic "Application error" page.
    redirect(`/admin/churches?error=${encodeURIComponent(message)}&blockedId=${id}`);
  }

  const { error } = await supabase.from('churches').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete church:', error);
    redirect(`/admin/churches?error=${encodeURIComponent(`Failed to delete church: ${error.message}`)}`);
  }

  revalidatePath('/admin/churches');
  revalidatePath('/churches');
}

export async function unlinkChurchEditors(formData: FormData) {
  const churchId = formData.get('churchId') as string;
  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ role: 'viewer', church_id: null })
    .eq('church_id', churchId);

  if (error) {
    console.error('Failed to unlink church editors:', error);
    redirect(`/admin/churches?error=${encodeURIComponent(`Failed to unlink editor: ${error.message}`)}`);
  }

  revalidatePath('/admin/churches');
  redirect('/admin/churches');
}

// Same unlink as above, but reachable directly from the church's own edit
// page (not just the delete-blocked banner) and redirects back there — this
// is the normal path for routine staff turnover, not just cleanup before
// a delete.
export async function unlinkChurchEditorFromEdit(formData: FormData) {
  const profileId = formData.get('profileId') as string;
  const churchId = formData.get('churchId') as string;
  const supabase = createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'viewer', church_id: null })
    .eq('id', profileId);

  if (error) {
    console.error('Failed to unlink church editor:', error);
    redirect(
      `/admin/churches/edit?id=${churchId}&error=${encodeURIComponent(`Failed to unlink editor: ${error.message}`)}`
    );
  }

  revalidatePath('/admin/churches');
  redirect(`/admin/churches/edit?id=${churchId}`);
}

// Directly grants editor access to an existing account by email — the
// UI equivalent of the manual SQL update documented in the Admin Guide.
// Skips the pending_editor step entirely, since the admin typing this
// email in and clicking the button IS the deliberate confirmation that
// activation would otherwise require.
export async function grantChurchEditor(formData: FormData) {
  const churchId = formData.get('churchId') as string;
  const email = (formData.get('email') as string)?.trim();
  const supabase = createClient();

  if (!email) {
    redirect(`/admin/churches/edit?id=${churchId}&error=${encodeURIComponent('Enter an email address.')}`);
  }

  const { data: profile, error: lookupError } = await supabase
    .from('profiles')
    .select('id, email, role, church_id, ministry_id')
    .ilike('email', email)
    .maybeSingle();

  if (lookupError) {
    console.error('Grant church editor: lookup failed:', lookupError);
    redirect(`/admin/churches/edit?id=${churchId}&error=${encodeURIComponent('Lookup failed — try again.')}`);
  }

  if (!profile) {
    redirect(
      `/admin/churches/edit?id=${churchId}&error=${encodeURIComponent(
        `No account found for "${email}" — ask them to sign up at /signup first, then try again.`
      )}`
    );
  }

  if (profile!.role === 'admin') {
    redirect(
      `/admin/churches/edit?id=${churchId}&error=${encodeURIComponent(
        `"${email}" is an admin account — can't also make it a church editor.`
      )}`
    );
  }

  if ((profile!.church_id && profile!.church_id !== churchId) || profile!.ministry_id) {
    redirect(
      `/admin/churches/edit?id=${churchId}&error=${encodeURIComponent(
        `"${email}" already has editor access elsewhere — unlink it there first.`
      )}`
    );
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'editor', church_id: churchId, ministry_id: null })
    .eq('id', profile!.id);

  if (error) {
    console.error('Failed to grant church editor access:', error);
    redirect(
      `/admin/churches/edit?id=${churchId}&error=${encodeURIComponent(`Failed to grant access: ${error.message}`)}`
    );
  }

  const { data: church } = await supabase.from('churches').select('name').eq('id', churchId).single();
  if (profile!.email) {
    await sendEmail({
      to: profile!.email,
      subject: 'Your LOTU.LIVE account is ready',
      text: `Hi there,

Your account for ${church?.name || 'your church'} has been activated. You can now log in and manage its page.

Log in here: https://lotu.live/login

From your dashboard you can:
- Update your church's profile (contact info, description, worship times, logo)
- Add and edit events
- Add and edit videos

Note: new events and videos you add need a quick review before they go live on the public site — you'll see a "Pending Approval" label until that happens.

— The LOTU.LIVE Team`,
    });
  }

  revalidatePath('/admin/churches');
  redirect(`/admin/churches/edit?id=${churchId}`);
}
