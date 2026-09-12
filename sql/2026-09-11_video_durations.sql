-- LOTU.LIVE — Video durations, for the LOTU.Live Channel feature
-- 2026-09-11
--
-- Powers the channel's scheduling math: given a fixed playlist order and
-- each video's exact duration, "what should be playing right now, and at
-- what timestamp" is fully computable from the current time alone — no
-- always-running process needed, just this data. Auto-populated via the
-- YouTube/Cloudflare APIs already integrated for other features; no
-- integration exists for Cloudinary, so those durations (if ever needed)
-- are entered manually as a fallback.

alter table videos add column if not exists duration_seconds integer;
