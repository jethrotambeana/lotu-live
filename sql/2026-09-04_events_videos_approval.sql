-- Editor-submitted events and videos now require admin approval before
-- appearing on the public site. Defaults to true so existing rows (and
-- anything created via the full admin panel) stay visible without any
-- backfill — only rows explicitly created/edited by an editor via
-- /manage get set to false.

alter table events add column approved boolean default true;
alter table videos add column approved boolean default true;

-- Public visibility now requires approval. Admins already see everything
-- regardless (their "admin write ... for all" policies aren't restricted
-- by this column), and editors already see their own church's rows
-- regardless via "editor manage own ... for all" — so only the public,
-- unauthenticated read policies need to change here.
drop policy "public read events" on events;
create policy "public read approved events" on events for select using (approved = true);

drop policy "public read videos" on videos;
create policy "public read approved videos" on videos for select using (approved = true);
