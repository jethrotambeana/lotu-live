-- LOTU.Live Channel admin controls: an admin-curated playlist (replaces
-- the old "shuffle every approved video with a duration" behavior) and a
-- single-row "play this video now" override the admin can set/clear.
-- Run in the Supabase SQL editor, same as sql/schema.sql.

-- ---------------------------------------------------------------------
-- channel_playlist: the ordered list of videos the LOTU.Live Channel
-- draws from. Admin builds/reorders this from Admin → Channel.
-- ---------------------------------------------------------------------
create table channel_playlist (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  position integer not null,
  created_at timestamptz default now()
);

-- A video can only appear once in the playlist — the admin UI already
-- hides videos that are already in it, this is just the DB-level backstop.
create unique index channel_playlist_video_unique on channel_playlist (video_id);
create index on channel_playlist (position);

alter table channel_playlist enable row level security;
-- Public read: the /channel page and its polling API route both run
-- under the anon/cookies-based client (see lib/supabaseServer.ts), same
-- as videos/livestreams — no visitor auth involved.
create policy "public read channel playlist" on channel_playlist for select using (true);
create policy "admin write channel playlist" on channel_playlist for all using (public.is_admin());

-- ---------------------------------------------------------------------
-- channel_override: a single row (id is always 1) holding the video an
-- admin has forced the channel to play right now, if any. video_id null
-- means "nothing forced." Plays once from the moment it's set — see
-- getChannelState() in lib/channelEmbed.ts, which computes how far into
-- the forced video "now" is from started_at, and lazily clears this row
-- once that runs past the video's duration (no cron job needed).
-- ---------------------------------------------------------------------
create table channel_override (
  id integer primary key,
  video_id uuid references videos(id) on delete set null,
  started_at timestamptz not null default now(),
  set_by uuid references profiles(id),
  constraint channel_override_singleton check (id = 1)
);

alter table channel_override enable row level security;
create policy "public read channel override" on channel_override for select using (true);
create policy "admin write channel override" on channel_override for all using (public.is_admin());

-- Seed the single row so admin actions can always UPDATE it (never need
-- to branch on "does the row exist yet").
insert into channel_override (id, video_id, started_at) values (1, null, now());
