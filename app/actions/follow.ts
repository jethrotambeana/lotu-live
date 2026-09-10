'use server';

import { createClient } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function toggleFollow(formData: FormData) {
  const type = formData.get('type') as 'church' | 'ministry';
  const id = formData.get('id') as string;
  const currentlyFollowing = formData.get('following') === 'true';
  const redirectTo = (formData.get('redirectTo') as string) || '/';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Preserve where they were trying to follow from, so login sends them
    // straight back here instead of dumping them on the homepage —
    // otherwise "follow this church" turns into a confusing dead end.
    redirect(`/login?next=${encodeURIComponent(redirectTo)}`);
  }

  const column = type === 'church' ? 'church_id' : 'ministry_id';

  if (currentlyFollowing) {
    await supabase.from('follows').delete().eq('user_id', user.id).eq(column, id);
  } else {
    // RLS's `with check (user_id = auth.uid())` is the real enforcement
    // here — this insert would be rejected for any other user_id
    // regardless of what a crafted request tried to send.
    await supabase.from('follows').insert({ user_id: user.id, [column]: id });
  }

  revalidatePath(redirectTo);
  revalidatePath('/following');
  redirect(redirectTo);
}
