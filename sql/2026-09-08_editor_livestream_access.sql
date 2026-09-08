-- LOTU.LIVE — Editor livestream access: RLS foundation
-- 2026-09-08
--
-- Two things happening here:
--
-- 1. SECURITY FIX: stream_schedules has never had row level security
--    enabled — no `alter table ... enable row level security` statement
--    exists for it anywhere, unlike every other table. Without RLS
--    enabled, Postgres falls back to standard GRANT-based access, and
--    Supabase's default grants make tables readable/writable by the
--    public `anon` key unless explicitly revoked. This is the same class
--    of gap the "contacts had no RLS" fix (see the comment above that
--    policy) already caught and fixed elsewhere — this one was missed.
--    Fixing it now: public read (needed for the schedule text already
--    shown on church/ministry pages), admin write, and scoped editor
--    write (added below).
--
-- 2. Church editors already have full row-level access to their own
--    livestreams via the existing "editor manage own livestreams" policy
--    (predates ministry-editor support). Ministry editors never got an
--    equivalent — adding it here as an ADDITIONAL policy, same pattern
--    already used for videos/events (church editors are unaffected).
--
-- RLS here governs which ROWS an editor can touch, not which COLUMNS —
-- Postgres RLS can't cleanly restrict individual fields within a row an
-- editor is otherwise allowed to update. Locking specific fields (the
-- stream's provider/provider_stream_id, visible, church/ministry
-- assignment, etc.) to admin-only happens at the application layer
-- instead — see app/manage/livestreams/actions.ts, which only ever
-- writes the safe subset of fields regardless of what a request contains.
-- This matches the existing pattern already used for churches: editors
-- have row-level UPDATE access there too, but the /manage church form
-- simply never renders (or accepts) the `active` field.
--
-- Idempotent: safe to re-run.

alter table stream_schedules enable row level security;

drop policy if exists "public read stream schedules" on stream_schedules;
create policy "public read stream schedules" on stream_schedules for select using (true);

drop policy if exists "admin write stream schedules" on stream_schedules;
create policy "admin write stream schedules" on stream_schedules for all using (public.is_admin());

drop policy if exists "editor manage own livestream schedules" on stream_schedules;
create policy "editor manage own livestream schedules" on stream_schedules for all using (
  exists (
    select 1 from livestreams l
    join profiles p on p.id = auth.uid()
    where l.id = stream_schedules.livestream_id
      and p.role = 'editor'
      and (
        (p.church_id is not null and p.church_id = l.church_id)
        or (p.ministry_id is not null and p.ministry_id = l.ministry_id)
      )
  )
);

drop policy if exists "editor manage own ministry livestreams" on livestreams;
create policy "editor manage own ministry livestreams" on livestreams for all using (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'editor' and ministry_id is not null and ministry_id = livestreams.ministry_id
  )
);
