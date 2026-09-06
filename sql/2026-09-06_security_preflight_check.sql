-- Run these two checks BEFORE the main migration. If either returns rows,
-- resolve them first (delete/fix the offending row, or unlink one of the
-- duplicate editors) — otherwise the corresponding step in the main
-- migration will fail with a constraint violation.

-- Check 1: any submissions with a blank email or contact name (the NOT
-- NULL constraints below will fail if any of these exist).
select 'submissions' as table_name, id, church_name as name, email, contact_name from submissions
  where email is null or contact_name is null
union all
select 'event_submissions', id, event_name, email, contact_name from event_submissions
  where email is null or contact_name is null
union all
select 'ministry_submissions', id, ministry_name, email, contact_name from ministry_submissions
  where email is null or contact_name is null;

-- Check 2: any church/ministry that already has more than one active or
-- pending editor (the unique indexes below will fail if any of these
-- exist — unlink one of the duplicates first via the Editor Access panel).
select church_id, count(*) from profiles
  where role in ('editor', 'pending_editor') and church_id is not null
  group by church_id having count(*) > 1
union all
select ministry_id, count(*) from profiles
  where role in ('editor', 'pending_editor') and ministry_id is not null
  group by ministry_id having count(*) > 1;
