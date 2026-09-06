-- Security audit fixes (Critical + High). All of these close gaps in what
-- was possible via direct API access outside the app's own UI — the app
-- itself never relied on any of the missing protections below, so none
-- of this changes normal behavior for admins, editors, or public visitors.

-- ============================================================
-- CRITICAL: contacts had NO row level security at all. Since the anon
-- key is necessarily public (it ships in the browser bundle), RLS is the
-- only real access boundary — with none in place, anyone with basic
-- familiarity with Supabase's REST API could read every name, email, and
-- message ever submitted through the public /contact form.
-- ============================================================
alter table contacts enable row level security;
create policy "public insert contacts" on contacts for insert with check (true);
create policy "admin read contacts" on contacts for select using (public.is_admin());

-- ============================================================
-- HIGH: countries, categories, and video_categories never had RLS
-- enabled, leaving them open to anonymous inserts/updates/deletes via
-- direct API calls (corrupting the country/category lists, or
-- arbitrarily reassigning which categories any video belongs to).
-- ============================================================
alter table countries enable row level security;
create policy "public read countries" on countries for select using (true);
create policy "admin write countries" on countries for all using (public.is_admin());

alter table categories enable row level security;
create policy "public read categories" on categories for select using (true);
create policy "admin write categories" on categories for all using (public.is_admin());

alter table video_categories enable row level security;
-- Public read is required — /videos' category filter and /video/[slug]'s
-- category display both query this table as an anonymous visitor.
create policy "public read video categories" on video_categories for select using (true);
create policy "admin write video categories" on video_categories for all using (public.is_admin());
-- Editors write to this table directly from /manage using their own
-- session (not the service role), so they need their own policy scoped
-- to videos they actually own.
create policy "editor manage own video categories" on video_categories for all using (
  exists (
    select 1 from videos v
    join profiles p on p.id = auth.uid()
    where v.id = video_categories.video_id
      and p.role = 'editor'
      and (
        (p.church_id is not null and p.church_id = v.church_id)
        or (p.ministry_id is not null and p.ministry_id = v.ministry_id)
      )
  )
);

-- ============================================================
-- HIGH: nothing at the database level stopped two different accounts
-- both being linked as editor (or pending editor) to the same church or
-- ministry — it was only ever prevented by the admin UI hiding the Grant
-- Access form once one editor exists. These partial unique indexes make
-- it impossible outright, regardless of how the write is attempted.
-- ============================================================
create unique index profiles_unique_church_editor
  on profiles (church_id)
  where role in ('editor', 'pending_editor') and church_id is not null;

create unique index profiles_unique_ministry_editor
  on profiles (ministry_id)
  where role in ('editor', 'pending_editor') and ministry_id is not null;

-- ============================================================
-- HIGH: contact_name and email were only "required" via the HTML forms'
-- client-side `required` attribute — nothing enforced this server-side,
-- so a direct API request could insert a submission with these blank,
-- silently breaking the notification and editor-matching flow for it.
-- ============================================================
alter table submissions alter column contact_name set not null;
alter table submissions alter column email set not null;
alter table event_submissions alter column contact_name set not null;
alter table event_submissions alter column email set not null;
alter table ministry_submissions alter column contact_name set not null;
alter table ministry_submissions alter column email set not null;
