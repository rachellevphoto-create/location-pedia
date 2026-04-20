# PhotoLoc

A community-driven hub where photographers discover, filter, and navigate to vetted photography locations - the "Waze and Wolt" of photography spots.

Built as a Next.js 14 full-stack app with PostgreSQL/PostGIS, Auth.js (NextAuth), Mapbox, Cloudinary, and Resend.

---

## Features

- **Manual-approval onboarding.** Every new user is reviewed by an admin (PRD section 3).
- **Discover page** with toggleable map and list views, filter chips (accessibility, transport, restroom, paid, style tags), URL-synced state, and PostGIS distance from the user.
- **Location detail** with dual gallery (Inspiration with watermark / Technical raw), chronological real-time updates with verified badges, helpful votes, star rating, and "Unlock secret" flow.
- **Submission wizard** with multi-step form, Mapbox pin picker, client-side compression to <=1 MB, signed Cloudinary upload, and admin notification.
- **Gamified points engine.** Submit (+50), photo (+20), update (+10), helpful received (+2), unlock secret (-100). Ledger-backed inside DB transactions.
- **Admin back-office.** Pending submissions queue with Approve / Approve-no-points / Return-for-revision (with feedback) / Reject. User approval/rejection/ban. Locations moderation table.
- **Email notifications via Resend** for welcome, user approval/rejection, location approval/revision/rejection.

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router, TypeScript, Server Actions) |
| Database | PostgreSQL 16 + PostGIS |
| ORM | Prisma 5 |
| Auth | Auth.js v5 (NextAuth) - Credentials + Email magic link |
| UI | Tailwind CSS + shadcn/ui + lucide-react |
| Map | Mapbox GL JS via `react-map-gl` |
| Images | Cloudinary (signed uploads, dynamic watermark transforms) |
| Email | Resend + React Email |
| Deploy | Vercel (app) + Neon (Postgres+PostGIS) |

---

## Local development

### 1. Prerequisites

- Node.js 20+
- Docker (for the local Postgres+PostGIS container)
- A Mapbox public token (free)
- Cloudinary account (free tier)
- Resend account + verified domain (optional - emails fall back to console logging)

### 2. Setup

```bash
cp .env.example .env
# Fill in CLOUDINARY_*, NEXT_PUBLIC_MAPBOX_TOKEN, RESEND_API_KEY (optional),
# AUTH_SECRET (generate with `openssl rand -base64 32`).

npm install
docker compose up -d            # boots Postgres+PostGIS on :5432
npx prisma migrate dev --name init
psql "$DATABASE_URL" -f prisma/postgis-index.sql   # spatial GIST index
npm run db:seed                 # creates admin@photoloc.local / changeme123!
npm run dev
```

Open http://localhost:3000.

### 3. Cloudinary watermark asset

Upload a transparent PNG (your logo) to Cloudinary and copy its public ID into `CLOUDINARY_WATERMARK_PUBLIC_ID`. The default is `photoloc/watermark`. Inspiration-tab photos render with this overlay automatically via Cloudinary URL transforms; Technical-tab photos render raw.

---

## Architecture

```
app/
  (auth)/                 # login, register, pending, blocked
  (app)/                  # gated routes (requires APPROVED status)
    discover/             # map + list toggle, filters, URL state
    locations/[slug]/     # detail page with gallery, updates, helpful, secret
    submit/               # multi-step submission wizard
    profile/              # user dashboard with points ledger
  admin/                  # role=ADMIN only
    submissions/, users/, locations/
  api/
    auth/[...nextauth]/   # Auth.js handlers
    locations/            # discover GET (filters, bbox, distance)
    upload/sign/          # Cloudinary signed uploads

lib/
  auth.ts                 # NextAuth config, requireUser/Approved/Admin helpers
  db.ts                   # Prisma client singleton
  geo.ts                  # PostGIS spatial queries (ST_Distance, bbox)
  cloudinary.ts           # signed upload + watermark transforms
  email.ts                # Resend wrapper
  points.ts               # awardPoints + unlockSecret transactions
  validation.ts           # Zod schemas for all forms

emails/                   # React Email templates

prisma/
  schema.prisma           # full data model
  postgis-index.sql       # GIST index for geo queries
  seed.ts                 # admin + demo photographer + sample locations

middleware.ts             # status-gates app routes; role-gates /admin
```

---

## Deployment

### Vercel + Neon

1. **Postgres**: create a Neon project, enable the `postgis` extension (Neon supports it natively):
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
2. **Deploy**: push to GitHub, import the repo into Vercel. Set the env vars from `.env.example`.
3. **Migrate** from local once after the first deploy:
   ```bash
   DATABASE_URL=<neon-pooled-connection-string> npx prisma migrate deploy
   psql "$DATABASE_URL" -f prisma/postgis-index.sql
   npm run db:seed
   ```
4. **Resend domain**: verify a sending domain in Resend, set `EMAIL_FROM=noreply@yourdomain.com`.
5. **Cloudinary upload preset**: not strictly required - we use signed uploads from the server.
6. **Mapbox**: any restricted public token. Add your Vercel domain to its allowed referers.

### Smoke-test checklist

- [ ] Visit `/` and `/discover` (public).
- [ ] Register at `/register`, see "pending" page.
- [ ] In a separate browser, sign in as admin and approve the user from `/admin/users`.
- [ ] First user receives approval email and can now access `/submit`.
- [ ] Submit a location with photos. It appears at `/admin/submissions`.
- [ ] Approve it. Submitter receives email and points (+50, +20 per photo).
- [ ] View on `/discover` (map and list), open detail page, post status update (+10), vote helpful, rate stars.
- [ ] Mark a location as Secret in submit. Use a second user's points to unlock it (-100).

---

## Success metrics (PRD section 9)

The `lib/analytics.ts` module emits structured events for the PRD success metrics. Wire it to PostHog/Mixpanel by replacing the `track()` body. Built-in admin dashboard at `/admin` shows snapshots: pending users/submissions, total published, status updates posted in last 7 days, sign-ups in last 7 days.

---

## Out of scope (deferred)

- Location-owner role (PRD calls it Future Phase).
- Payments for premium / secret unlocks (points-only for MVP).
- Native mobile apps (the web app is mobile-first responsive).
- Real-time websockets (status updates are SSR / poll-based).
