import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import FollowButton from '@/components/FollowButton';

export default async function FollowingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/following');
  }

  const { data: follows } = await supabase
    .from('follows')
    .select('church_id, ministry_id, churches(slug, name, town, logo_url), ministries(slug, name, town, logo_url)')
    .eq('user_id', user.id);

  const churchFollows = (follows ?? []).filter((f: any) => f.church_id);
  const ministryFollows = (follows ?? []).filter((f: any) => f.ministry_id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Following</h1>
      <p className="mb-6 text-slate-500">
        Churches and ministries you follow. You'll get an email whenever one of them goes live.
      </p>

      {(follows ?? []).length === 0 && (
        <p className="text-slate-500">
          You're not following anyone yet — visit a church or ministry's page and tap "Follow" to
          add it here.
        </p>
      )}

      {churchFollows.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-semibold">Churches</h2>
          <div className="space-y-2">
            {churchFollows.map((f: any) => (
              <div
                key={f.church_id}
                className="flex items-center justify-between rounded border border-slate-200 p-3"
              >
                <Link href={`/church/${f.churches.slug}`} className="hover:underline">
                  <p className="font-medium">{f.churches.name}</p>
                  <p className="text-sm text-slate-500">{f.churches.town}</p>
                </Link>
                <FollowButton type="church" id={f.church_id} following redirectTo="/following" />
              </div>
            ))}
          </div>
        </section>
      )}

      {ministryFollows.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Ministries</h2>
          <div className="space-y-2">
            {ministryFollows.map((f: any) => (
              <div
                key={f.ministry_id}
                className="flex items-center justify-between rounded border border-slate-200 p-3"
              >
                <Link href={`/ministry/${f.ministries.slug}`} className="hover:underline">
                  <p className="font-medium">{f.ministries.name}</p>
                  <p className="text-sm text-slate-500">{f.ministries.town}</p>
                </Link>
                <FollowButton type="ministry" id={f.ministry_id} following redirectTo="/following" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
