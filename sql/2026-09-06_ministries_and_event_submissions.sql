-- Adds Ministries as a full peer content type alongside Churches — a
-- ministry can optionally belong to one church, or stand alone (e.g. a
-- regional youth ministry). Ministries get the same self-service editor
-- model churches already have: submit → admin approves → matching
-- account can be activated as editor → manage their own profile, events,
-- and videos via /manage.
--
-- Also adds public submission support for standalone Events (previously
-- only editors/admins could create events at all).

-- 1. Ministries table.
create table ministries (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  type text not null check (type in (
    'music_singing', 'media_video', 'livestream_team', 'youth',
    'outreach', 'prayer', 'childrens', 'other'
  )),
  church_id uuid references churches(id),   -- optional; null = independent ministry
  country_id uuid references countries(id),
  island_province text,
  town text,
  description text,
  logo_url text,
  phone text,
  email text,
  website text,
  facebook text,
  youtube text,
  approved boolean default true,            -- public submissions create this
                                             -- via admin approval already
                                             -- reviewed, so true immediately;
                                             -- mirrors churches' pattern
  created_at timestamptz default now()
);
create index on ministries (church_id);
create index on ministries (country_id);

-- 2. ministry_id on videos and events, so a ministry can post its own
-- videos and (optionally) organize its own events, same as churches do
-- via church_id / host_church_id.
alter table videos add column ministry_id uuid references ministries(id);
alter table events add column host_ministry_id uuid references ministries(id);
create index on videos (ministry_id);
create index on events (host_ministry_id);

-- 3. profiles.ministry_id — an editor manages EITHER a church OR a
-- ministry, never both (enforced below), mirroring church_id's existing
-- role in the editor-activation flow.
alter table profiles add column ministry_id uuid references ministries(id);
create index on profiles (ministry_id);
alter table profiles add constraint profiles_single_scope_check
  check (church_id is null or ministry_id is null);

-- 4. Public submission tables — mirrors how church submissions already
-- work: public inserts a request, admin reviews and approves it, which
-- creates the real row. Kept as separate tables (rather than direct
-- inserts into events/ministries) so the public never has direct insert
-- access to live content tables at all — consistent with how churches
-- already work today.

create table event_submissions (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  hosted_by text,                            -- free-text organizer name,
                                              -- used if not a registered
                                              -- church/ministry
  host_church_id uuid references churches(id),
  host_ministry_id uuid references ministries(id),
  country_id uuid references countries(id),
  island_province text,
  venue text,
  town text,
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  description text,
  contact_name text,
  email text,
  phone text,
  website text,
  facebook text,
  youtube text,
  poster_url text,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);

create table ministry_submissions (
  id uuid primary key default gen_random_uuid(),
  ministry_name text not null,
  type text not null check (type in (
    'music_singing', 'media_video', 'livestream_team', 'youth',
    'outreach', 'prayer', 'childrens', 'other'
  )),
  church_id uuid references churches(id),    -- optional link to an existing church
  country_id uuid references countries(id),
  island_province text,
  town text,
  description text,
  contact_name text,
  email text,
  phone text,
  website text,
  facebook text,
  youtube text,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);

-- 5. RLS. Uses the is_admin() SECURITY DEFINER helper already created for
-- profiles, so admin read/write here doesn't need its own recursion
-- workaround.

alter table ministries enable row level security;
alter table event_submissions enable row level security;
alter table ministry_submissions enable row level security;

create policy "public read approved ministries" on ministries for select using (approved = true);
create policy "admin write ministries" on ministries for all using (public.is_admin());
create policy "editor update own ministry" on ministries for update using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'editor' and ministry_id = ministries.id
  )
);

create policy "public insert event submissions" on event_submissions for insert with check (true);
create policy "admin read event submissions" on event_submissions for select using (public.is_admin());
create policy "admin manage event submissions" on event_submissions for update using (public.is_admin());

create policy "public insert ministry submissions" on ministry_submissions for insert with check (true);
create policy "admin read ministry submissions" on ministry_submissions for select using (public.is_admin());
create policy "admin manage ministry submissions" on ministry_submissions for update using (public.is_admin());

-- 6. Editor access to ministry-scoped videos/events, parallel to the
-- existing church-scoped editor policies. Church editors are unaffected —
-- these are additional policies, not replacements.
create policy "editor manage own ministry videos" on videos for all using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'editor' and ministry_id is not null and ministry_id = videos.ministry_id
  )
);
create policy "editor manage own ministry events" on events for all using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'editor' and ministry_id is not null and ministry_id = events.host_ministry_id
  )
);

-- 7. Extend the signup trigger to also match against ministries.email,
-- same logic as the existing churches.email match. Checks churches first;
-- a signup only ever lands as pending_editor for one or the other.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  matched_church_id uuid;
  matched_ministry_id uuid;
begin
  select c.id into matched_church_id
  from public.churches c
  where c.email is not null
    and lower(c.email) = lower(new.email)
    and not exists (
      select 1 from public.profiles p
      where p.church_id = c.id and p.role in ('editor', 'pending_editor')
    )
  limit 1;

  if matched_church_id is null then
    select m.id into matched_ministry_id
    from public.ministries m
    where m.email is not null
      and lower(m.email) = lower(new.email)
      and not exists (
        select 1 from public.profiles p
        where p.ministry_id = m.id and p.role in ('editor', 'pending_editor')
      )
    limit 1;
  end if;

  insert into public.profiles (id, role, email, church_id, ministry_id)
  values (
    new.id,
    case when matched_church_id is not null or matched_ministry_id is not null
      then 'pending_editor' else 'viewer' end,
    new.email,
    matched_church_id,
    matched_ministry_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer
set search_path = public;
