# Legal SOS — Admin Console

Internal operations dashboard for the Legal SOS dispatch system.
Deploys to **admin.legalsos.lawyer**. Powers the same backend the
mobile app calls.

## Stack

- **Next.js 16** (App Router, React 19)
- **Drizzle ORM** (Postgres dialect) — schema in `lib/db/schema.ts`
- **Neon Postgres** for production (Vercel-attached integration)
- **tRPC v11** for type-safe end-to-end API
- **TanStack React Query** for client cache
- **Tailwind CSS 4**

## Local development

### 1. Run a local Postgres

Easiest options:

```bash
# Option A — Docker (recommended)
docker run -d --name legal-sos-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=legal_sos_admin \
  -p 5432:5432 \
  postgres:16

# Option B — Homebrew (macOS)
brew install postgresql@16
brew services start postgresql@16
createdb legal_sos_admin
```

### 2. Configure env

```bash
cp .env.example .env.local
# edit .env.local — set DATABASE_URL to your local connection string
```

For local Docker:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/legal_sos_admin
```

### 3. Push the schema

```bash
npm run db:push    # Creates tables from lib/db/schema.ts
# OR for a migration-style flow:
npm run db:generate  # Creates a migration file in ./drizzle
npm run db:migrate   # Applies migrations
```

### 4. (Optional) Seed demo data

```bash
npm run db:seed
```

This inserts 4 lawyers and 5 cases mirroring the demo data the
dashboard renders when the database is empty.

### 5. Run the dev server

```bash
npm run dev
# → http://localhost:3011
```

## Production deployment — Vercel

The Vercel project should be created from this directory:

- **Root directory**: `apps/legal-sos-admin`
- **Framework preset**: Next.js
- **Domain**: `admin.legalsos.lawyer` (configure in Vercel → Domains)
- **Build command**: leave as default (`npm run build`) — our `build`
  script runs `drizzle-kit migrate` first, then `next build`.
- **Install command**: `npm install --legacy-peer-deps`

### Env vars to set in Vercel

| Variable | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Neon integration | Auto-set when you attach the Neon integration in Vercel → Integrations → Neon |
| `AUTH_SECRET` | `openssl rand -base64 48` | Used to sign admin session cookies |
| `NEXT_PUBLIC_APP_URL` | `https://admin.legalsos.lawyer` | Used for absolute URL generation |

### How migrations run on deploy

`package.json` build command:

```json
"build": "drizzle-kit migrate && next build"
```

When Vercel runs the build, `drizzle-kit migrate` connects to the
production `DATABASE_URL` and applies every pending migration in
`./drizzle/` (alphabetical order). If a migration fails, the build
fails — Vercel rolls back to the previous deployment, leaving the
database in the same state as before.

For schema changes:

```bash
# 1. Edit lib/db/schema.ts
# 2. Generate migration locally
npm run db:generate
# → produces ./drizzle/0001_xxx.sql

# 3. Apply locally to test
npm run db:migrate

# 4. Commit and push — Vercel applies it during build
git add drizzle/
git commit -m "feat(db): <description>"
git push
```

## Architecture

```
┌──────────────────────────┐
│  admin.legalsos.lawyer   │  Next.js UI + tRPC API
│  (Vercel)                │  ── /api/trpc/* served from same app
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  Neon Postgres           │  Production database
│  (Vercel integration)    │  Shared with mobile app
└──────────────────────────┘
             ▲
             │  /api/trpc/* (same backend, different client)
             │
┌──────────────────────────┐
│  Legal SOS mobile app    │  Expo / React Native
│  (App Store/Play Store)  │
└──────────────────────────┘
```

## Routes

| Path | Description |
|---|---|
| `/` | Redirects to `/dashboard` |
| `/dashboard` | Operations overview · stats · active cases |
| `/cases` | Full case list with filters |
| `/lawyers` | Lawyer roster + on-call toggle |
| `/payouts` | Per-lawyer settlement view |
| `/settings` | Platform configuration |
| `/api/trpc/*` | Type-safe API endpoints (also called by mobile app) |

## Schema overview

| Table | Purpose |
|---|---|
| `lawyers` | Registered advocates: roll #, phone, country, languages, radius, on-call flag |
| `cases` | Every SOS request — type, fulfillment, client, lawyer, status, payment, refund, settle |
| `consent_log` | Signed consent records (client + advocate) with hash of the contract version |
| `advocate_shifts` | Weekly on-call windows (UTC minute-of-day) |
| `push_subscriptions` | Web Push + Expo Push subscriptions |
| `admin_users` | Operator accounts for this dashboard |

See `lib/db/schema.ts` for the canonical definition. All tables have
matching indexes for the obvious access patterns.
