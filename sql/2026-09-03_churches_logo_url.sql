-- Optional church logo/image, shown alongside the church in the directory
-- listing and on its profile page. Nullable — no admin is required to set
-- one, and existing rows are unaffected.

alter table churches add column logo_url text;
