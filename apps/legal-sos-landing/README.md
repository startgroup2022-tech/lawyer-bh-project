# Legal SOS — Landing Page

Marketing site for the Legal SOS mobile app. Deploys to **legalsos.lawyer**.

## Stack

- **Next.js 16** (App Router, React 19)
- **Tailwind CSS 4**
- No database, no API — pure static-ish marketing page.

## Local dev

```bash
npm install --legacy-peer-deps
npm run dev
# → http://localhost:3010
```

## Production deployment — Vercel

- **Root directory**: `apps/legal-sos-landing`
- **Framework preset**: Next.js
- **Domain**: `legalsos.lawyer`
- **Install command**: `npm install --legacy-peer-deps`
- No env vars required.

## DNS setup

Point `legalsos.lawyer` at Vercel:

```
A    @     76.76.21.21
```

Or use Vercel's nameservers (cleaner — automatic SSL, CDN, etc.):

```
NS   @     ns1.vercel-dns.com
NS   @     ns2.vercel-dns.com
```

For `admin.legalsos.lawyer` (the admin app, separate Vercel project):

```
CNAME admin cname.vercel-dns.com
```

## What's on the page

| Section | Source |
|---|---|
| Hero | Logo + tagline + 3 phone-mockup screens |
| Features | 6 product strengths (one-tap SOS, 15-min consultation, GPS dispatch, etc.) |
| Service catalog | All 6 case types with fees |
| How it works | 3-step explainer (pick country → tap SOS → connect) |
| Country availability | 6 GCC markets, Bahrain live |
| Download CTAs | App Store + Google Play (disabled until published) |
| Footer | Contact, legal links, "Powered by lawyers.bh" |

Phone mockups are pure CSS/SVG — no image files needed. They mirror
the actual mobile app's screens (country selector, SOS button, in-call
screen). When the real app ships, swap them for App Store screenshots.
