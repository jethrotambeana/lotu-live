-- LOTU.LIVE core schema
-- Run in Supabase SQL editor. Assumes Supabase's built-in `auth.users`.

create extension if not exists "pgcrypto";

create table countries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null            -- e.g. 'VU', 'SB', 'PG', 'FJ'
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique            -- Church Worship, Evangelism, Youth, etc.
);

create table organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_id uuid references countries(id),
  website text,
  facebook text,
  youtube text
);

create table churches (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_url text,                       -- optional; shown in directory listings and profile
  country_id uuid references countries(id),
  island_province text,
  town text,
  address text,
  phone text,
  email text,
  website text,
  facebook text,
  youtube text,
  description text,
  worship_times text,
  created_at timestamptz default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  hosted_by text,                      -- free-text label; used when the host
                                        -- isn't a registered church (e.g. an
                                        -- outside organisation or conference)
  host_church_id uuid references churches(id), -- proper FK when the host IS
                                        -- a registered church; the public
                                        -- site prefers this over hosted_by
                                        -- when both are present
  country_id uuid references countries(id),
  description text,
  venue text,
  town text,
  island_province text,
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  languages text[],
  website text,
  facebook text,
  youtube text,
  poster_url text,
  status text default 'upcoming' check (status in ('upcoming','current','completed')),
  approved boolean default true,       -- editor-submitted events/edits start
                                        -- false and need admin approval;
                                        -- true by default so admin-created
                                        -- rows need no backfill
  created_at timestamptz default now()
);

create table livestreams (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  type text check (type in ('church','event','organisation')),
  church_id uuid references churches(id),
  event_id uuid references events(id),
  organisation_id uuid references organisations(id),
  provider text not null check (provider in ('cloudflare','youtube','facebook','hls')),
  provider_stream_id text not null,   -- Cloudflare Live Input ID / YouTube video-live ID / approved HLS URL
  preview_image text,
  country_id uuid references countries(id),
  island_province text,
  location text,
  language text,
  category_id uuid references categories(id),
  start_at timestamptz,
  end_at timestamptz,
  featured boolean default false,
  feature_start timestamptz,
  feature_end timestamptz,
  feature_priority int default 0,
  visible boolean default true,
  status text default 'offline' check (status in ('live','offline','upcoming','scheduled')),
  created_at timestamptz default now()
);

create table stream_schedules (
  id uuid primary key default gen_random_uuid(),
  livestream_id uuid references livestreams(id) on delete cascade,
  day_of_week int check (day_of_week between 0 and 6),  -- 0 = Sunday
  start_time time,
  timezone text default 'Pacific/Efate'
);

create table videos (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  church_id uuid references churches(id),
  event_id uuid references events(id),
  speaker text,
  series text,
  provider text not null check (provider in ('cloudflare','youtube','cloudinary')),
  provider_video_id text not null,
  thumbnail text,
  language text,
  description text,
  recorded_date date,
  approved boolean default true,       -- editor-submitted videos/edits start
                                        -- false and need admin approval;
                                        -- true by default so admin-created
                                        -- rows need no backfill
  created_at timestamptz default now()
);

create table video_categories (
  video_id uuid references videos(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  primary key (video_id, category_id)
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  church_name text not null,
  country_id uuid references countries(id),
  island_province text,
  location text,
  contact_name text,
  email text,
  phone text,
  website text,
  facebook text,
  youtube text,
  streaming_platform text,
  livestream_ref text,          -- provider ID or URL as submitted, unvalidated
  status text default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  country_id uuid references countries(id),
  subject text,
  message text,
  created_at timestamptz default now()
);

create table site_settings (
  key text primary key,
  value jsonb
);

-- profile table extending auth.users with a role for admin gating
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text default 'viewer' check (role in ('viewer','editor','admin')),
  email text,                          -- synced via handle_new_user trigger
  church_id uuid references churches(id) -- set when role = 'editor'; the one
                                        -- church this account may manage
);
create index on profiles (church_id);

-- Auto-create a profiles row (role 'viewer') for every new signup, so
-- self-service church-editor linking (see submissions approval flow) can
-- match by email reliably regardless of signup order.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, email)
  values (new.id, 'viewer', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpful indexes
create index on livestreams (status, visible);
create index on livestreams (country_id);
create index on videos (recorded_date desc);
create index on churches (country_id);
create index on events (start_date);
create index on events (host_church_id);

-- Basic full-text search (Phase 1, per doc section 20)
alter table churches add column search_vector tsvector
  generated always as (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(town,''))) stored;
alter table events add column search_vector tsvector
  generated always as (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(venue,''))) stored;
alter table videos add column search_vector tsvector
  generated always as (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(speaker,'') || ' ' || coalesce(series,''))) stored;
create index on churches using gin (search_vector);
create index on events using gin (search_vector);
create index on videos using gin (search_vector);

-- Row Level Security: public read on published content, writes admin-only
alter table churches enable row level security;
alter table events enable row level security;
alter table livestreams enable row level security;
alter table videos enable row level security;
alter table submissions enable row level security;
alter table profiles enable row level security;

create policy "public read churches" on churches for select using (true);
create policy "public read approved events" on events for select using (approved = true);
create policy "public read visible livestreams" on livestreams for select using (visible = true);
create policy "public read approved videos" on videos for select using (approved = true);
-- submissions: insert-only from the public; admins can read (see below),
-- no read access for anyone else.
create policy "public insert submissions" on submissions for insert with check (true);
create policy "admin read submissions" on submissions for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Admin write policies (requires profiles.role = 'admin')
create policy "admin write churches" on churches for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "admin write events" on events for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "admin write livestreams" on livestreams for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "admin write videos" on videos for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "admin manage submissions" on submissions for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- profiles itself only had a "read own profile" policy for a long time
-- (see README §6 on the original RLS-recursion fix), which meant an admin
-- could never read or update any OTHER user's row — silently breaking
-- things like the editor auto-link step. Fixed via a SECURITY DEFINER
-- helper, which avoids the same recursion that caused the original policy
-- to be removed rather than fixed.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "read own profile" on profiles for select using (auth.uid() = id);
create policy "admin read all profiles" on profiles for select using (public.is_admin());
create policy "admin write all profiles" on profiles for update using (public.is_admin());

-- Church editors: scoped access to only the one church they're linked to
-- (profiles.church_id), enforced here at the database level as a backstop
-- to the application-level scoping in app/manage/*.
create policy "editor update own church" on churches for update using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'editor' and church_id = churches.id
  )
);
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

-- Seed the four launch countries
insert into countries (name, code) values
  ('Vanuatu', 'VU'),
  ('Solomon Islands', 'SB'),
  ('Papua New Guinea', 'PG'),
  ('Fiji', 'FJ');
