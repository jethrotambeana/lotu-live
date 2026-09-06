-- events previously had no email/phone/contact_name columns at all —
-- contact info was collected on event_submissions but never carried over
-- once approved, meaning it was impossible to see or update an event's
-- contact email after the fact. Churches and ministries already support
-- this (editable via both /admin and /manage); this brings events in line.

alter table events add column contact_name text;
alter table events add column email text;
alter table events add column phone text;
