-- Part A: Ministries can now have livestreams linked to them (admin-only,
-- same as churches — no editor access changes at all here).
alter table livestreams add column ministry_id uuid references ministries(id);
create index on livestreams (ministry_id);

alter table livestreams drop constraint if exists livestreams_type_check;
alter table livestreams add constraint livestreams_type_check
  check (type in ('church', 'event', 'organisation', 'ministry'));

-- Part B: submission review timestamps, so the 60-day cleanup counts from
-- when a submission was actually reviewed, not when it was originally
-- filed (a submission approved on day 59 still gets a full 60 days of
-- visibility afterward, not just 1).
alter table submissions add column updated_at timestamptz default now();
alter table event_submissions add column updated_at timestamptz default now();
alter table ministry_submissions add column updated_at timestamptz default now();
