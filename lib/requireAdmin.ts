import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

// Call this at the top of any /admin page or layout.
// Redirects to /login if not signed in, or to / if signed in but not an admin.
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  if (!profile || profile.role !== 'admin') {
    redirect('/');
  }

  return { supabase, user };
}
