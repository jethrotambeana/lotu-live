# LOTU.LIVE — Project README

**The Pacific Adventist Media Network**
Live site: https://lotu.live (previously lotulive.netlify.app — see §8)
Repository: https://github.com/jethrotambeana/lotu-live

> This document reflects the state of the project as of **September 3, 2026**.
> Update it whenever significant features are added, changed, or removed.

---

## 1. What This Is

LOTU.LIVE is a discovery and directory platform for Seventh-day Adventist
livestreams, church profiles, events, and video content across Vanuatu,
Solomon Islands, Papua New Guinea, and Fiji. It does not host video itself —
streams and videos remain on YouTube, Cloudflare Stream, Facebook, Cloudinary,
or HLS sources, and LOTU.LIVE organizes and presents them through one branded
site.

## 2. Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Hosting | Netlify (auto-deploys from GitHub) |
| Database, Auth, Storage | Supabase (Postgres) |
| Version control | GitHub (`jethrotambeana/lotu-live`) |

## 3. Current Status (as of Sep 3, 2026)

### ✅ Working
- Full GitHub → Netlify → Supabase pipeline: pushing to `main` auto-deploys.
- Public site with logo, nav, and footer.
- Homepage: hero, country shortcuts, Live Now, Coming Up, submission CTA.
- Public directory pages, each with filter dropdowns that read/write the URL
  query string (bookmarkable, shareable filtered links):
  - `/churches` — filter by Country, Island/Province.
  - `/events` — filter by Country, Status (Upcoming/Current/Completed).
  - `/videos` — filter by Category (via the `video_categories` join table),
    Language.
  - `/live` — filter by Country, Type (Church/Event/Organisation), Status,
    Language.
  - Filter option lists for Island/Province and Language are derived from
    whatever values actually exist in the data, not a fixed list.
- Other public pages: `/countries` (+ per-country pages), `/about`,
  `/contact` (working form → `contacts` table), `/submit` (public church
  submission form → `submissions` table).
- Detail pages: `/church/[slug]`, `/event/[slug]`, `/watch/[slug]`,
  `/video/[slug]`.
- Admin panel at `/admin`, protected by Supabase Auth + role check:
  - **Dashboard** — summary counts.
  - **Churches** — list, add, edit, delete.
  - **Events** — list, add, edit, delete.
  - **Livestreams** — list, add, edit, delete, show/hide toggle. Provider
    field is a dropdown (Cloudflare / YouTube / Facebook / HLS) with a
    single ID/URL field — never raw embed HTML, for security. Preview
    Image auto-fills for YouTube and Cloudflare Stream when left blank;
    Facebook and HLS require pasting a URL manually.
  - **Videos** — list, add, edit, delete. Provider field is a dropdown
    (Cloudflare / YouTube / Cloudinary) with a single ID/URL field, same
    security approach as Livestreams. Thumbnail auto-fills for YouTube and
    Cloudflare Stream when left blank; Cloudinary and any manually-uploaded
    Cloudflare Images (`imagedelivery.net`) URLs are pasted manually.
    Categories are assigned via checkboxes backed by the
    `video_categories` join table.
  - **Messages** — read-only list of `/contact` submissions.
  - **Submissions** — church sign-up requests from `/submit`, with
    Approve (auto-creates a church record) / Reject actions.
- `/login` and `/signup` pages for Supabase Auth email/password accounts.
  Every signup auto-creates a `profiles` row (`role = 'viewer'` by default,
  via a database trigger) — signing up alone grants no special access.
- **Church editor accounts** (`/manage`): a lighter, self-service tier
  below full admin. A user with `role = 'editor'` and a linked `church_id`
  can manage only their own church's profile, livestreams, events, and
  videos — scoped both in the UI and via Row Level Security policies at
  the database level. Becoming an editor happens automatically when a
  church submission is approved and the submitter's email matches an
  existing account (see Admin Guide); otherwise an admin links it manually.
- Database schema with Row Level Security on every table (`sql/schema.sql`).

### 🚧 Not Yet Built
- Automatic live/offline detection via provider APIs (still manual: an
  admin sets `status` to `live` themselves).
- Thumbnail auto-derivation for Cloudinary videos (currently manual paste
  only — would need a known Cloudinary cloud name to build the same kind
  of predictable-URL trick used for YouTube/Cloudflare Stream).
- Country/type join-based filtering on `/churches` and `/events` beyond
  what's listed above (e.g. combining country + category together where
  relevant).
- Notifications, favorites, managed/native streaming.

## 4. Project Structure

```
app/
  page.tsx                 Homepage (Live Now / Coming Up)
  live/page.tsx             Live directory, with filter bar
  churches/page.tsx          Church directory, with filter bar
  church/[slug]/page.tsx     Church profile
  events/page.tsx            Event listing, with filter bar
  event/[slug]/page.tsx      Event profile
  countries/page.tsx         Country index
  countries/[code]/page.tsx  Per-country churches/events
  videos/page.tsx            Video catalogue, with filter bar
  video/[slug]/page.tsx      Single video page
  watch/[slug]/page.tsx      Single livestream viewing page
  about/page.tsx             About page
  contact/page.tsx           Contact form
  submit/page.tsx            Public church submission form
  login/page.tsx             Admin login
  signup/page.tsx             Admin account creation
  admin/
    layout.tsx               Auth guard + sidebar nav
    page.tsx                 Dashboard
    churches/                List, add/edit form, actions
    events/                  List, add/edit form, actions
    livestreams/             List, add/edit form, actions (thumbnail auto-fill)
    videos/                  List, add/edit form, actions (thumbnail auto-fill, categories)
    messages/page.tsx        Contact messages list
    submissions/             Church submissions + approve/reject actions
                              (approve auto-links a matching-email account
                              as the new church's editor)
  manage/
    layout.tsx               Editor auth guard + sidebar nav
    page.tsx                 Own church profile form, actions.ts
    livestreams/              List, add/edit form, actions — scoped to own church
    events/                  List, add/edit form, actions — scoped to own church
    videos/                  List, add/edit form, actions — scoped to own church
lib/
  supabaseClient.ts          Browser Supabase client
  supabaseServer.ts          Server Component Supabase client (cookie-aware)
  embed.ts                   Whitelisted provider embed builder; also exports
                              extractYouTubeId/extractCloudflareId and
                              CLOUDFLARE_CUSTOMER_CODE
  thumbnails.ts              Shared YouTube/Cloudflare thumbnail derivation,
                              used by livestreams, videos, and manage actions
  requireAdmin.ts            Shared admin auth check
  requireChurchEditor.ts     Shared church-editor auth check (role='editor'
                              + church_id), used by all /manage routes
components/
  LiveCard.tsx, StreamPlayer.tsx, ContactForm.tsx,
  SubmitChurchForm.tsx, LogoutButton.tsx, FilterBar.tsx
sql/
  schema.sql                 Full DB schema, RLS policies, seed data
middleware.ts                 Keeps Supabase auth session refreshed
public/
  logo.png
next.config.js                 Image domain allowlist (see §6)
```

## 5. Environment Variables (set in Netlify → Environment Variables)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key (safe to expose client-side) |
| `NEXT_PUBLIC_CLOUDFLARE_CUSTOMER_CODE` | Cloudflare Stream customer subdomain code, used both to build the video/livestream player embed and to auto-derive Cloudflare Stream thumbnails |

## 6. Known Issues Fixed So Far

- **RLS infinite recursion**: a policy on `profiles` that checked admin
  status by querying `profiles` itself caused role checks to silently fail.
  Fixed by dropping that policy — role changes are made directly via SQL
  Editor by the project owner instead.
- **Server-side session not recognized after login**: the initial
  `supabaseServer.ts` only read cookies, never wrote them, so `getUser()`
  couldn't see a freshly-logged-in session. Fixed by adding proper
  get/set/remove cookie handlers plus `middleware.ts` to refresh sessions.
- **Email confirmation link → localhost**: Supabase's Site URL defaulted to
  `localhost:3000`. Fixed under Authentication → URL Configuration by
  setting the Site URL and adding a wildcard Redirect URL for the real
  Netlify domain.
- **Server Action crash on odd stream ID format**: an overly strict
  validation `throw` crashed the whole page instead of showing a friendly
  message. Changed to a non-blocking console warning — the real security
  protection (URL-encoding) doesn't depend on this check.
- **Auto-derived thumbnails 400'd**: an early version of the thumbnail
  auto-fill logic pointed YouTube thumbnails at `img.youtube.com`, which
  isn't in `next.config.js`'s image allowlist (only `i.ytimg.com` is).
  Fixed by switching the derivation to `i.ytimg.com`. `imagedelivery.net`
  (Cloudflare Images, distinct from Cloudflare Stream) was also added to
  the allowlist so manually-pasted thumbnails from that service work too.
- **Homepage and `/live` showing no thumbnails despite valid data**: both
  pages spread the Supabase row (`{...s}`) directly into `<LiveCard>`,
  which passes a `preview_image` prop — but `LiveCard` expects
  `previewImage` (camelCase). The mismatched prop was silently `undefined`,
  so the `<Image>` never rendered and no network request ever fired. Fixed
  by explicitly mapping `previewImage={s.preview_image}` on both pages.
- **Admin → Submissions always showing "No submissions yet," even for
  submissions that saved successfully**: the original RLS setup gave
  `submissions` an INSERT policy (for the public `/submit` form) and an
  UPDATE policy (for Approve/Reject), but never a SELECT policy. With RLS
  enabled and no SELECT policy, Postgres denies all reads by default —
  so no one, including admins, could ever read the table back, even
  though every submission was actually being saved correctly the whole
  time. Fixed by adding an admin-only SELECT policy.

## 7. Next Steps To Consider

- Consider provider API integration for automatic live/offline status.
- Consider Cloudinary thumbnail auto-derivation if a stable cloud
  name/public-ID convention gets established.
- Revisit whether `/churches` and `/events` need additional filters (e.g.
  category) as more content is added.

## 8. Custom Domain (lotu.live)

The site now runs on **lotu.live** as its primary domain (previously
`lotulive.netlify.app`). Migration checklist:

- Domain added and verified in Netlify → Domain management, set as primary.
- DNS pointed at Netlify — either via Netlify DNS (nameserver delegation)
  or an external A record (`@` → Netlify's load balancer IP) plus a `www`
  CNAME. Whichever was chosen, don't mix both methods.
- SSL certificate auto-provisioned by Netlify once DNS propagated.
- **Supabase → Authentication → URL Configuration**: Site URL updated to
  `https://lotu.live`, and `https://lotu.live/**` added to Redirect URLs.
  This is the same setting responsible for the "confirmation link →
  localhost" bug fixed earlier (§6) — skipping this step would silently
  break signup/login confirmation emails on the new domain.
- `lotulive.netlify.app` still resolves unless explicitly removed or
  redirected in Netlify — decide whether to leave it as a working alias or
  add a redirect rule to `lotu.live`.
- No code changes were needed for links generated at runtime (e.g. the
  Share button uses `window.location.href`), since those are always
  relative to whatever domain the page is actually served from.
