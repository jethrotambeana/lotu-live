# LOTU.LIVE

The Pacific Adventist Media Network — a regional livestream and video
discovery platform for Vanuatu, Solomon Islands, Papua New Guinea and Fiji.

Scaffold generated from the platform concept doc. This is a **starting
skeleton**, not a finished product — pages have working data queries but
minimal styling, and several sections (filters UI, admin CRUD forms, search,
sharing buttons) are stubbed with comments marking where to build them out.

## Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind
- **Hosting:** Netlify (`@netlify/plugin-nextjs`)
- **Database / Auth / Storage:** Supabase (Postgres)
- **Video:** Cloudflare Stream, YouTube, Facebook embeds, or HLS — never raw
  embed HTML (see `lib/embed.ts`)

## 1. Set up Supabase

1. Create a project at supabase.com.
2. Open the SQL editor and run `sql/schema.sql`. It creates all tables,
   indexes, full-text search columns, and Row Level Security policies, and
   seeds the four launch countries.
3. To make yourself an admin: sign up once through Supabase Auth, then run
   `insert into profiles (id, role) values ('<your-auth-uid>', 'admin');`
4. Copy `.env.example` to `.env.local` and fill in your project URL and anon
   key from Supabase → Project Settings → API.

## 2. Run locally

```bash
npm install
npm run dev
```

## 3. Deploy to Netlify

1. Push this repo to GitHub.
2. In Netlify: New site from Git → select the repo. `netlify.toml` already
   configures the build command and the Next.js runtime plugin.
3. Add the same environment variables from `.env.local` in Netlify's
   Site settings → Environment variables.
4. Deploy. Netlify will detect `netlify.toml` and build automatically.

## Project structure

```
app/
  page.tsx                Homepage: hero, Live Now, Coming Up, submission CTA
  live/page.tsx           Live directory with filters
  watch/[slug]/page.tsx   Single stream viewing page (player mounts here only)
  church/[slug]/page.tsx  Church profile
  event/[slug]/page.tsx   Event profile
  videos/page.tsx         Video catalogue
  video/[slug]/page.tsx   Single video page
  admin/page.tsx          Role-gated admin dashboard shell
lib/
  supabaseClient.ts       Browser Supabase client
  supabaseServer.ts       Server Component Supabase client
  embed.ts                Whitelisted provider embed builder (security-critical)
components/
  LiveCard.tsx            Preview card — no player mounted until clicked
  StreamPlayer.tsx        Actual player, built from lib/embed.ts
sql/
  schema.sql              Full database schema + RLS policies + seed data
```

## What's not built yet (see the concept doc's phased plan)

- Filter UI wiring on `/live` (country, content type, language selects)
- Church/event submission form → `submissions` table
- Admin CRUD screens for each table
- Featured broadcast homepage block
- Automatic live/offline detection via provider APIs (Phase 2)
- Notifications, favourites, managed streaming (Phase 2–3)
