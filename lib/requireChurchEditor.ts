import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

export async function requireChurchEditor() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, church_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'editor' || !profile.church_id) {
    redirect('/');
  }

  return { supabase, user, churchId: profile.church_id as string };
}
