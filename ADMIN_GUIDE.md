# LOTU.LIVE — Admin Guide

This guide covers two things: **using the admin panel** day-to-day, and
**making and deploying code changes** to the site via GitHub. Keep this
alongside the project README.

---

## Part 1 — Using the Admin Panel

### Logging in

1. Go to `https://lotulive.netlify.app/login`
2. Enter your email and password
3. You'll land on `/admin` if your account has admin access

If you don't have an account yet, go to `/signup`, create one, confirm your
email, then have an existing admin grant you access (see "Managing Admin
Access" below).

### The Dashboard

Shows quick counts: total churches, currently-live streams, pending
submissions, and contact messages. It's a summary only — click into a
section in the left sidebar to actually manage anything.

### Managing Churches

**Admin → Churches**

- **Add Church**: fill in the form. Only *Name* is required — everything
  else (address, phone, socials, worship times, description) is optional
  and can be added later.
- **Slug**: this becomes the church's URL (`/church/your-slug`). Leave it
  blank and it's generated automatically from the name.
- **Edit** / **Delete**: available from the church list.
- **Island/Province** is worth filling in even though it's optional — the
  public `/churches` page filters by whatever values are actually in use,
  so leaving it blank means that church won't be reachable via that filter.

### Managing Events

**Admin → Events**

Same pattern as churches. Additional fields: venue, start/end date and
time, and a status (Upcoming / Current / Completed) — set this manually as
an event approaches, happens, and finishes. The public `/events` page lets
visitors filter by Country and by this same Status field.

### Managing Livestreams

**Admin → Livestreams**

This is the one you'll touch most often — every time a church goes live or
an event stream needs to be added.

**Important: only ever enter the provider's own ID or URL, never embed
code.** The site builds the video player itself from a trusted template for
security. Pasting `<iframe>` or other HTML here will not work and is not
supported.

| Field | What to enter |
|---|---|
| Provider | Choose Cloudflare Stream, YouTube, Facebook, or HLS |
| Provider Stream ID / URL | **YouTube**: just the video ID (the part after `v=` in a YouTube URL, e.g. `dQw4w9WgXcQ`) — a full URL also works, the ID gets extracted automatically. **Cloudflare**: the Live Input ID from your Cloudflare dashboard, or a full `cloudflarestream.com` URL. **Facebook**: the full public video/page URL. **HLS**: the full `.m3u8` stream URL. |
| Church / Event | Link this stream to an existing church or event, if applicable |
| Preview Image URL | Leave blank for **YouTube** or **Cloudflare Stream** — it auto-fills from the provider's own thumbnail. For **Facebook** or **HLS**, paste a thumbnail URL manually since those providers don't expose a predictable one. |
| Status | `live` while streaming, `offline` when not, `upcoming`/`scheduled` for future streams |
| Visible | Uncheck to hide from the public site without deleting it |
| Featured | Highlights it in featured sections (once that homepage section is built) |
| Language | Optional, but filled-in values become filter options on `/live` |

Once you save a stream with status `live` and Visible checked, it appears
under "Live Now" on the homepage and `/live` automatically.

**Note on the auto-filled preview image**: it's derived once, at the moment
you click Save. If you add a stream with a blank Preview Image and later
want the auto-fill to (re-)apply — e.g. after fixing the Provider Stream ID
— just open Edit and click Save Changes again with the field still blank.

**Show/Hide**: use the quick toggle in the list instead of editing the full
form if you just need to temporarily hide something.

### Managing Videos

**Admin → Videos**

Same security principle as Livestreams: only enter the provider's own ID or
URL, never embed code.

| Field | What to enter |
|---|---|
| Church / Event | Optional — link the video to an existing church or event if relevant |
| Speaker / Series | Optional metadata shown on the video's detail page |
| Provider | Choose Cloudflare Stream, YouTube, or Cloudinary |
| Provider Video ID / URL | **YouTube**: video ID or full URL. **Cloudflare**: video UID or full `cloudflarestream.com` URL. **Cloudinary**: whatever ID/URL convention you're using — there's no established format yet, so nothing is validated here. |
| Thumbnail URL | Leave blank for **YouTube** or **Cloudflare Stream** — auto-fills from the provider. For **Cloudinary**, or if you've uploaded a thumbnail separately to **Cloudflare Images** (`imagedelivery.net` URLs), paste it manually. |
| Language | Optional, but filled-in values become filter options on `/videos` |
| Categories | Checkboxes pulled from the `categories` table. Check as many as apply — this feeds the Category filter on `/videos`. If no categories show up, none have been created yet (see "Managing Categories" below). |
| Recorded Date | Optional; used to sort the video catalogue newest-first |

Same note as Livestreams applies: the auto-filled thumbnail is derived at
save time, so re-save (with Thumbnail URL left blank) if you need it to
re-apply.

### Managing Categories

There's no admin UI for categories yet — add or rename them directly in
Supabase → **Table Editor → categories** (just an `id` and a `name`
column). Once a category exists there, it immediately shows up as a
checkbox option when adding/editing a video, and as a filter option on
`/videos`.

### Filters on the Public Site

`/churches`, `/events`, `/videos`, and `/live` each show filter dropdowns
to visitors. These aren't configured anywhere — they're generated
automatically from whatever data already exists (e.g. every distinct
Island/Province value across churches becomes an option). There's nothing
to maintain here beyond keeping the underlying fields (Island/Province,
Language, Category, Status, Country) filled in accurately, since a blank
field on a record just means that record won't surface under that filter.

### Reading Contact Messages

**Admin → Messages** — shows everything submitted via the public
`/contact` form. Read-only; there's no reply-from-the-panel feature, so
reply via your own email using the address shown.

### Handling Church Submissions

**Admin → Submissions** — shows churches submitted via the public
`/submit` form ("Add Your Church").

- **Approve**: automatically creates a real church profile from the
  submitted details and marks the submission as approved. You can then
  edit that new church record under Admin → Churches to fill in anything
  the submitter left out.
- **Reject**: marks it rejected. It stays in the list for your records but
  won't create a church.

### Managing Admin Access

There's no in-panel "invite an admin" button yet — this is done directly
in Supabase:

1. Have the new person create an account at `/signup` and confirm their
   email.
2. In Supabase → **Authentication → Users**, find their account and copy
   its UUID.
3. In Supabase → **SQL Editor**, run:
   ```sql
   insert into profiles (id, role) values ('THEIR-UUID-HERE', 'admin');
   ```
4. They can now log in at `/login` and reach `/admin`.

To remove admin access without deleting their account:
```sql
update profiles set role = 'viewer' where id = 'THEIR-UUID-HERE';
```

### Logging Out

Click **Log out** at the bottom of the admin sidebar.

---

## Part 2 — Making Changes & Deploying via GitHub

The site's code lives on GitHub. Every time you push a change to the
`main` branch, Netlify automatically rebuilds and republishes the live
site within a minute or two — no manual deploy step needed.

### One-time setup (already done, for reference)

- Git installed locally (Git Bash on Windows)
- Authenticated to GitHub via `gh auth login`
- Repository: `https://github.com/jethrotambeana/lotu-live.git`
- Netlify connected to that repository for auto-deploy

### The everyday workflow

Whenever you (or a developer) make code changes — new pages, admin
features, bug fixes:

```bash
cd path/to/lotu-live
git status                      # see what changed
git add .                       # stage everything changed
git commit -m "Describe the change"
git push                        # uploads to GitHub — triggers Netlify deploy
```

Then go to Netlify → your site → **Deploys** tab and watch for it to say
"Published." That confirms the live site has been updated.

### If a deploy fails or the site errors after a push

1. Check the **Deploys** tab in Netlify — click the failed/latest deploy to
   see the build log and error.
2. If the site builds fine but a *page* errors when visited, check
   **Logs & metrics → Functions → Next.js Server Handler** in Netlify for
   the real-time server error log (Next.js hides detailed errors from the
   page itself in production for security, so the logs are the only place
   to see the actual cause).
3. If an image fails to load with a 400 from `/_next/image`, that's almost
   always a domain missing from the `images.remotePatterns` allowlist in
   `next.config.js` — check the failing request's `url=` parameter in
   DevTools to see which hostname needs adding, then redeploy.
4. Common causes we've hit before:
   - A Server Action throwing an uncaught error instead of handling it
     gracefully — check the function logs for a stack trace.
   - Missing or incorrect environment variables in Netlify.
   - A database change (e.g. a new required column) that the code doesn't
     account for yet.
   - A prop name mismatch between a page's Supabase query (snake_case
     column names) and the component it feeds (which may expect
     camelCase) — this fails silently with no console error, since the
     component just receives `undefined` and skips rendering. Worth
     checking directly against the component's prop types if something
     renders blank with no error at all.

### Database changes

Any change to the database schema (new tables, columns, policies) is made
directly in Supabase's **SQL Editor**, not through Git. Keep a copy of any
schema-changing SQL you run — consider appending it to `sql/schema.sql` in
the repo afterward so the file stays an accurate record of the current
database structure.

### Rolling back a bad deploy

In Netlify's **Deploys** tab, every past deploy is listed. Click an older,
working deploy and choose **"Publish deploy"** to instantly roll the live
site back to that version while you fix the issue in code. This doesn't
undo any database changes — only the website code.

---

*Keep this guide updated as new admin features (e.g. provider API live
detection, custom domain, Cloudinary thumbnail auto-fill) are added.*
