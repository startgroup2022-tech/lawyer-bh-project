# Legal SOS Mobile — Backend Integration Plan

## Product positioning

- **lawyers.bh** is the parent web platform (directory, services, legal tools, business services, notary, execution). It hosts a web surface of the SOS engine at `lawyers.bh/[locale]/sos`.
- **Legal SOS** is a separate mobile product. Different brand on the surface, but **powered by the same backend** (same Postgres DB, same `/api/sos/*` API surface, same business rules and audit trail).
- Both surfaces are clients of the same engine. The mobile app is rebranded but functionally equivalent.

## Locked decisions

| Topic | Decision |
|---|---|
| First slice | Client SOS request flow (caseRef-anonymous, no auth needed) |
| Auth (later phases) | Phone + OTP (SMS) for advocate and optionally for client history |
| Push provider | Expo Push (native), alongside existing Web Push |
| Maps SDK | react-native-maps (Google on Android, Apple on iOS) |
| Design | Keep existing mockup design intact — only swap mock data for live data |

## Architecture

```
┌────────────────────────────────────┐    ┌────────────────────────────────┐
│  lawyers.bh (Next.js on Vercel)    │    │  Legal SOS (Expo / React Native)│
│  - Web /sos request flow           │    │  - Native client + lawyer apps  │
│  - Dispatch console                │    │  - Push notifications           │
│  - Legal tools, directory, etc.    │    │                                 │
└──────────────┬─────────────────────┘    └────────────┬───────────────────┘
               │                                       │
               │      /api/sos/* (same routes)         │
               └─────────────────┬─────────────────────┘
                                 │
                       ┌─────────▼──────────┐
                       │  Neon Postgres     │
                       │  emergency_requests│
                       │  consent_log       │
                       │  bahrain_lawyers      │
                       │  advocate_shifts   │
                       │  push_subscriptions│
                       └────────────────────┘
```

## Brand separation rules

- Mobile app wordmark: **LEGAL SOS**
- Tagline: "Because the first hour defines your future." (matches web)
- Optional footer credit on About/Settings: "Powered by lawyers.bh"
- Bundle ID stays `bh.lawyers.legalsos` (under lawyers.bh namespace)
- Deep link scheme stays `legalsos://`

## Phases & deliverables

### Phase 0 — Rebrand (this session)
- Replace all `LAWYERS.BH` strings in mobile screens with `LEGAL SOS`
- Lawyer login subtitle stays `LAWYER APP`, brand becomes `LEGAL SOS`
- Client home brand stack: `LEGAL SOS` over `EMERGENCY LEGAL HELP`
- Role selector top: `LEGAL SOS` over `BAHRAIN'S 24/7 LEGAL EMERGENCY`
- `app.json` already says `Legal SOS` — verify
- No design changes; visual mockup preserved

### Phase 1 — API client scaffolding (this session)
- `EXPO_PUBLIC_API_URL` via app.json `extra` → typed `constants/env.ts`
- `lib/api.ts` — `apiFetch<T>(path, init)` wrapper with base URL, JSON parse, error normalization (`ApiError` type)
- `lib/secureStore.ts` — wrapper around `expo-secure-store` with keys: `activeCaseRef`, `sessionToken`, `sessionRole` (client | advocate), `pushToken`
- `lib/sosTypes.ts` — share interfaces with backend (DispatchRequest, DispatchResponse, StatusResponse, CaseTypeId)

### Phase 2 — Smoke test wiring (this session)
- Add a tiny "ping" call from client home: on mount, if `activeCaseRef` exists, fetch `/api/sos/status/[caseRef]`; route to `/tracking` if status is `pending` or `mobilizing`, `/rate` if `completed`, clear if anything else.
- Acceptance: launch app, no crash; if no active case, normal home; if active case, route correctly.
- Bundle compiles and runs at `exp://192.168.100.177:8081`.

### Phase 3 — Client SOS request flow (next session)
- `select-emergency`: use `caseTypes` from backend (or hardcoded mirror) with bilingual labels + base fee
- `location`: real GPS via `expo-location`; reverse-geocode for display address; manual fallback input
- `kyc` (currently part of mockup): wire to consent payload
- `consent + signature`: capture signature, build dispatch payload
- Submit → `POST /api/sos/dispatch`
- Receive `caseRef`, store in SecureStore, route to `tracking`
- `tracking`: poll `GET /api/sos/status/[caseRef]` every 5s
- No backend changes required for this slice

### Phase 4 — react-native-maps integration (next session)
- Install `react-native-maps` + `expo-location`
- Replace `components/MockMap.tsx` with a real `LiveMap.tsx` that renders client pin + advocate pin
- Dark map style aligned with mockup palette
- Used on: client tracking, lawyer on-the-way, lawyer arrived

### Phase 5 — Lawyer Phone+OTP auth + dispatch flow
- **Backend additions:**
  - SMS provider integration (Twilio recommended, supports Bahrain)
  - `POST /api/sos/otp/request` (rate-limited)
  - `POST /api/sos/otp/verify` → returns session token (HMAC JWT, 7d)
  - `phone_otps` table (phone, code_hash, expires_at, attempts, used_at)
- **Mobile additions:**
  - Lawyer login: enter phone → request OTP → verify code → store session token
  - Authenticated requests via `Authorization: Bearer <token>` header
  - Home: GET online status + cases nearby
  - Online toggle → POST `/lawyer/online`
  - New request alert → POST `/lawyer/case/[caseRef]/accept`
  - GPS reporter task → POST `/lawyer/case/[caseRef]/location` every N seconds while mobilizing
  - Arrived → POST `/lawyer/case/[caseRef]/arrived`
  - Complete → POST `/lawyer/case/[caseRef]/complete`

### Phase 6 — Expo Push notifications
- **Backend additions:**
  - Extend `lawyer_push_subscriptions` with `kind` column (`'web' | 'expo'`, default `'web'`)
  - For Expo rows: `endpoint` holds the Expo push token, `p256dh` and `auth` are nullable
  - Update `lib/sos/webpush.ts` to dispatch to `expo-server-sdk` for `expo` rows and Web Push for `web` rows
- **Mobile additions:**
  - On login: register Expo push token via `expo-notifications`
  - POST to `/lawyer/push/subscribe` with `{ kind: 'expo', token }`
  - Notification handler routes to the relevant case screen on tap

### Phase 7 — Payment + rating + earnings
- Client tracking → when `paymentStatus === 'pending'`, open Tap goSell URL in `expo-web-browser`
- Poll status until `success`, route to rating
- Lawyer earnings screen reads from a new endpoint (or computed from `/lawyer/cases?settled=...`)

## File ownership map

| Concern | Web (lawyers.bh) | Mobile (Legal SOS) |
|---|---|---|
| API routes | `app/api/sos/**` (authoritative) | calls only |
| DB schema | `lib/db/schema.ts` (authoritative) | none |
| Email templates | `lib/emailTemplates.ts` | none |
| Push delivery | `lib/sos/webpush.ts` → both Web + Expo | none |
| Consent legal text | `lib/sos/consentText.ts` (authoritative) | reads via API |
| Case types catalog | `lib/sos/caseTypes.ts` (authoritative) | mirrors via API or static |
| Mobile API client | n/a | `lib/api.ts` |
| Mobile secure storage | n/a | `lib/secureStore.ts` |
| Mobile maps | n/a | `components/LiveMap.tsx` (Phase 4) |

## Risks & open questions

- **Phone OTP provider cost & rate limits** — Twilio per-SMS to Bahrain. Need to enable rate limits to prevent abuse.
- **App Store / Play Store review** — emergency apps face extra scrutiny. Plan submission copy carefully.
- **Background location for advocates** — iOS background tracking needs explicit Apple review approval ("always" permission).
- **Brand confusion** — make sure lawyers.bh and Legal SOS are clearly distinct in users' minds; cross-link via "Powered by" only.
- **Payment in-app** — Apple's IAP rules may require us to keep payment in a browser handoff (Tap goSell), not in-app native checkout.
