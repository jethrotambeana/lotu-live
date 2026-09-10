-- LOTU.LIVE — Continuous/24-7 livestream flag
-- 2026-09-10
--
-- For channels that are meant to always be live (a TV network, a radio
-- station) rather than a typical service that goes live/offline in
-- discrete bursts. "Just went live" is a meaningless, potentially spammy
-- signal for something that's supposed to always be on — a brief network
-- blip and reconnect would otherwise re-trigger a fresh "it's live!"
-- email to every follower. This flag lets an admin opt a stream out of
-- follower notifications entirely, without affecting anything else about
-- how it's monitored (live/offline status detection and recording import
-- both continue working normally regardless of this flag).

alter table livestreams add column if not exists is_continuous boolean not null default false;
