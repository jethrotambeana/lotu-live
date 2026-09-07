import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

export type EditorScope = { type: 'church'; id: string } | { type: 'ministry'; id: string };

export async function requireEditor() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, church_id, ministry_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'editor' || (!profile.church_id && !profile.ministry_id)) {
    redirect('/');
  }

  // profiles has a check constraint preventing both from being set at
  // once, so exactly one of these is guaranteed to be present here.
  const scope: EditorScope = profile.church_id
    ? { type: 'church', id: profile.church_id }
    : { type: 'ministry', id: profile.ministry_id as string };

  // Confirm the linked church/ministry is currently Active. The public
  // read policy on churches/ministries (the only SELECT policy that ever
  // granted a plain editor read access to their own row — "editor update
  // own church/ministry" only covers UPDATE) now requires active = true.
  // So an Inactive record is invisible here even though profiles still
  // points at it, and that's exactly the signal we want: treat "can't see
  // it" as "editor access is suspended while Inactive," rather than
  // letting the rest of /manage crash on a missing record.
  const table = scope.type === 'church' ? 'churches' : 'ministries';
  const { data: record } = await supabase.from(table).select('id').eq('id', scope.id).maybeSingle();

  if (!record) redirect('/account-inactive');

  return { supabase, user, scope };
}
