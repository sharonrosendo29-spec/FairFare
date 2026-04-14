# FairFare 🚗🍔
### Gig Worker Transparency Platform — v2.0

A community platform where rideshare drivers, delivery workers, and passengers expose unfair platform cuts, upload photo proof, flag bad posts, and subscribe to a weekly digest.

---

## What's new in v2

- **📷 Photo uploads** — attach receipts, screenshots, pay stubs as proof
- **🚩 Community flagging** — flag posts as spam/fake/inappropriate
- **🛡 Admin moderation dashboard** — review flags, keep or delete posts at `/admin`
- **📧 Weekly email digest** — top 5 posts delivered to subscribers every week

---

## 🚀 Setup (all free)

### 1. Supabase — database + file storage

1. [supabase.com](https://supabase.com) → New project
2. SQL Editor → run `supabase_schema.sql`, then `supabase_schema_v2.sql`
3. Storage → New bucket → name: `post-photos` → set **Public: ON**
4. In that bucket → Policies → add policy: name `Anyone can upload`, operation `INSERT`, definition `true`
5. Settings → API → copy your **Project URL**, **anon key**, and **service_role key**

### 2. Resend — free transactional email

1. [resend.com](https://resend.com) → create account → API Keys → create one → copy it

### 3. Vercel — hosting

1. Push files to a GitHub repo
2. [vercel.com](https://vercel.com) → Add New Project → import repo
3. Add Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL        = your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   = your Supabase anon key
SUPABASE_SERVICE_ROLE_KEY       = your Supabase service_role key
RESEND_API_KEY                  = re_your_resend_key
DIGEST_FROM_EMAIL               = digest@yourdomain.com
ADMIN_SECRET                    = pick_any_strong_password
```

4. Deploy → live in ~2 minutes

### 4. Weekly digest cron (free via cron-job.org)

1. [cron-job.org](https://cron-job.org) → new cron job
2. URL: `https://your-site.vercel.app/api/digest`, Method: `POST`
3. Header: `Authorization: Bearer your_ADMIN_SECRET`
4. Schedule: `0 9 * * 1` (every Monday 9am)

---

## 🔐 Admin panel

Go to `/admin` on your site, enter your `ADMIN_SECRET` password.

You can: review flagged posts, keep or delete them, and manually send the weekly digest.

---

## 🏃 Run locally

```bash
npm install
cp .env.example .env.local   # fill in your credentials
npm run dev
# App: http://localhost:3000
# Admin: http://localhost:3000/admin
```

---

## 📁 File structure

```
pages/
  index.js                 Main feed + subscribe widget
  unsubscribe.js           Email unsubscribe page
  admin/index.js           Moderation dashboard
  api/
    posts.js               GET/POST posts
    stats.js               Company breakdown stats
    upload.js              Photo upload to Supabase Storage
    subscribe.js           Email subscribe / unsubscribe
    digest.js              Send weekly digest (call via cron)
    posts/[id]/vote.js     Upvote a post
    posts/[id]/flag.js     Flag a post for moderation

components/
  PostCard.js              Post card with photos + flag button
  SubmitModal.js           Submit form with photo upload
  Subscribe.js             Email subscribe widget

lib/
  supabase.js              Public client
  supabaseAdmin.js         Server-only admin client

supabase_schema.sql        Run first in Supabase SQL editor
supabase_schema_v2.sql     Run second (photos, flags, subscribers)
```

Built with Next.js + Supabase + Resend + Vercel. Free for ~50k monthly visitors.
