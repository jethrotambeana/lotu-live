-- site_settings has existed since the original schema but was never used
-- by any feature — this wires it up for the first time, storing the
-- About page's editable content. Also closes its missing-RLS gap (a
-- Medium finding from the 2026-09-06 security audit, left unfixed at the
-- time since nothing used the table yet).

alter table site_settings enable row level security;
drop policy if exists "public read site settings" on site_settings;
create policy "public read site settings" on site_settings for select using (true);
drop policy if exists "admin write site settings" on site_settings;
create policy "admin write site settings" on site_settings for all using (public.is_admin());

insert into site_settings (key, value) values (
  'about_page',
  '{
    "tagline": "The Pacific Gospel Media Network",
    "content": "LOTU.LIVE brings together Seventh-day Adventist worship services, evangelistic meetings, youth programs, camp meetings and other religious livestreams into one easy-to-use website — a single place to discover and watch, rather than searching separately across Facebook, YouTube, church websites and streaming providers.\n\nOur initial focus covers Vanuatu, Solomon Islands, Papua New Guinea and Fiji, with the platform built so more Pacific countries can join over time.\n\nStreams and videos remain hosted on trusted platforms — YouTube, Cloudflare Stream, Facebook and other providers — while LOTU.LIVE organises everything into a searchable, branded directory that makes it easy for churches to be found and for viewers to watch worship together, wherever they are.",
    "image_url": null
  }'::jsonb
)
on conflict (key) do nothing;
