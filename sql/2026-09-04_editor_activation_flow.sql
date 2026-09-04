-- Introduces a manual activation gate between "email matches a church" and
-- "actually has editor access." Previously, approveSubmission would
-- instantly promote a matching account straight to 'editor' with no human
-- review. Now, any match — whether detected at church-approval time or at
-- signup time — lands the account in 'pending_editor' instead, visible in
-- Admin → Submissions for an explicit one-click Activate.

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('viewer', 'pending_editor', 'editor', 'admin'));

-- Extends the signup trigger to also catch the reverse ordering: someone
-- signs up AFTER their church was already approved. It matches on
-- churches.email (already populated from the original submission) rather
-- than needing a new submissions→churches link, and only matches a church
-- that doesn't already have an editor (or pending editor) attached.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  matched_church_id uuid;
begin
  select c.id into matched_church_id
  from churches c
  where c.email is not null
    and lower(c.email) = lower(new.email)
    and not exists (
      select 1 from profiles p
      where p.church_id = c.id and p.role in ('editor', 'pending_editor')
    )
  limit 1;

  insert into public.profiles (id, role, email, church_id)
  values (
    new.id,
    case when matched_church_id is not null then 'pending_editor' else 'viewer' end,
    new.email,
    matched_church_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;
