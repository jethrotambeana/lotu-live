-- LOTU.LIVE — Read/unread tracking for contact messages
-- 2026-09-08
--
-- contacts had no way to distinguish a brand-new message from one an
-- admin already saw — every row looked identical in Admin → Messages.
-- Adds `read`, defaulting new rows to false (unread), so the sidebar
-- badge and in-page "New" highlighting introduced alongside this have
-- something to key off.
--
-- The backfill below is a ONE-TIME step: it marks every message that
-- exists at the moment this runs as already-read, so the new unread
-- badge starts at zero instead of suddenly counting your entire message
-- history as unread. Don't re-run this file after real unread messages
-- have come in — doing so would incorrectly mark those read too.

alter table contacts add column if not exists read boolean not null default false;

update contacts set read = true where read = false;
