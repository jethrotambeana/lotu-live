import { toggleFollow } from '@/app/actions/follow';

export default function FollowButton({
  type,
  id,
  following,
  redirectTo,
}: {
  type: 'church' | 'ministry';
  id: string;
  following: boolean;
  redirectTo: string;
}) {
  return (
    <form action={toggleFollow}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="following" value={String(following)} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button
        type="submit"
        className={
          following
            ? 'rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50'
            : 'rounded bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500'
        }
      >
        {following ? 'Following ✓' : '+ Follow'}
      </button>
    </form>
  );
}
