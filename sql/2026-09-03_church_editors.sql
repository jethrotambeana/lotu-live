-- Adds self-service "church editor" access: a user tied to exactly one
-- church (profiles.church_id) who can manage that church's own profile,
-- livestreams, events, and videos — nothing belonging to any other church,
-- and nothing else in the admin panel.

-- 1. New profiles columns.
alter table profiles add column email text;
alter table profiles add column church_id uuid references churches(id);
create index on profiles (church_id);

-- Backfill email for any profiles rows that already exist.
update profiles p set email = u.email from auth.users u where p.id = u.id and p.email is null;

-- 2. Auto-create a profiles row (role defaults to 'viewer' — no special
-- access) for every new signup. This is what makes email-matching in the
-- submission-approval flow work reliably for people who sign up before,
-- during, or after submitting a church. It does NOT change who can reach
-- /admin: a 'viewer' row is treated identically to having no row at all by
-- requireAdmin.ts (both fail the `role !== 'admin'` check).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, email)
  values (new.id, 'viewer', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. RLS: scope an editor's write access to only the church they're linked
-- to, enforced at the database level (not just hidden in the UI). These
-- are ADDITIONAL permissive policies — Postgres OR's them together with
-- the existing "public read" and "admin write" policies already in place,
-- so nothing about admin or public access changes.

-- Churches: editors may UPDATE their own church's profile, but not create
-- or delete church records — those stay admin/submission-flow only.
create policy "editor update own church" on churches for update using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'editor' and church_id = churches.id
  )
);

-- Livestreams, events, and videos: editors may fully manage (insert,
-- update, delete, and see even non-visible drafts of) records scoped to
-- their own church.
create policy "editor manage own livestreams" on livestreams for all using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'editor' and church_id = livestreams.church_id
  )
);

create policy "editor manage own events" on events for all using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'editor' and church_id = events.host_church_id
  )
);

create policy "editor manage own videos" on videos for all using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'editor' and church_id = videos.church_id
  )
);
