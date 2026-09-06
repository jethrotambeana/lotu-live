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

  return { supabase, user, scope };
}
