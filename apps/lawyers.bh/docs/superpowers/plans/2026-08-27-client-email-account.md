# Client Email Account Implementation Plan

**Goal:** Create real app client accounts using full name, email and international phone, verified by email OTP; allow later email-only login.

**Architecture:** Flutter service/repository/view-model/view separated by responsibility. PostgreSQL is authoritative for verification, account identity and revocable sessions. Postmark delivers a six-digit code; secure device storage holds a random session token. No password or SMS. No automatic claim of existing requests by email/phone.

**Tech Stack:** Flutter, secure storage, HTTP, Next route handlers, PostgreSQL/Drizzle, existing Postmark.

## Global constraints

- Preserve lawyer sessions, request access tokens, payment and country work.
- Accounts are created only after a delivered, valid code is consumed atomically.
- Expiry: OTP 10 minutes, session 30 days; five verification attempts, one send/minute, five sends/email/hour, twenty sends/IP/hour. Limits persisted across Vercel instances.
- HMAC codes with dedicated CLIENT_AUTH_SECRET; never log/return codes or tokens except the successful session response. Do not silently substitute test delivery.
- Mobile signup includes full name (2–120 chars), normalized email (<=254), and E.164 phone (8–15 digits, leading +). Phone is contact data, NOT phone-verified.
- Existing verified email logs into the existing account without overwriting its profile from a new signup form.
- No deployment, production migration, credentials edits or real email delivery in tests.

## Task 1: Server identity and OTP

Files: lib/client-auth/{validation,store,runtime,http}.ts; app/api/mobile/client-auth/{request,verify,session}/route.ts; schema.ts and migration0047.

- [x] Write failing normalization, expiration, replay/attempt and delivery-failure tests.
- [x] Implement input validation and HMAC digests, transactional rate limits, one-use challenge consumption and hashed sessions.
- [x] Deliver using existing Postmark; activate the challenge only after successful delivery. Failed delivery must not create an account.
- [x] Implement request/verify/session GET/DELETE routes with bounded bodies, no-store, generic errors, and bearer authentication.
- [x] Run focused tests and an isolated PostgreSQL integration check; no production writes.

## Task 2: Flutter registration and profile

Files: lib/features/client/auth/{data,controllers,screens}; client_profile_screen.dart; pubspec.yaml; corresponding tests.

- [x] Test API parsing, failed verification, session restore/logout and UI field/OTP transitions.
- [x] Add secure credential storage, API service and repository; store no OTP locally.
- [x] Add full name/email/phone registration, email-only login, six-digit code entry, resend cooldown and errors. Localized Arabic/English/Turkish and theme-aware layout.
- [x] Hook existing profile buttons; replace placeholder identity with server-returned identity. Logout revokes client session without clearing lawyer state or request access.
- [x] Verify widget tests and analyzer. Initial account work does not claim cross-device request sync or migrate guest request ownership.

## Task 3: Verification and handoff

- [x] Run focused backend and Flutter suites; test wrong/expired/reused codes and rate limits.
- [x] Typecheck and build without running production migrations.
- [ ] Report exact local evidence, new migration and environment requirements. Verify actual delivery and native secure storage on device before release.

## Release requirements (not performed)

1. Set a dedicated, cryptographically random `CLIENT_AUTH_SECRET` of at least 32 characters on the server. Never embed it in Flutter.
2. Configure existing Postmark with `POSTMARK_SERVER_TOKEN` (or `POSTMARK_API_TOKEN`), verified `POSTMARK_FROM_EMAIL`, and optional `POSTMARK_MESSAGE_STREAM` (defaults to `outbound`). No new provider is required.
3. Review and apply migration `0047_mobile_client_accounts.sql` through the normal Drizzle migration process to the intended database. Check pending migrations first; the project's default build runs migrations, whereas verification here used `build:next-only`.
4. Deploy the backend, then rebuild the app including its new native secure-storage plugin. Hot reload alone is insufficient.
5. Verify a real email arrives, wrong/replayed codes fail, login survives an app restart, and logout revokes the session on a physical device. Confirm the lawyer session is preserved.

Guest request ownership remains unchanged. This account feature does not associate old requests by email/phone or implement cross-device request synchronization.

## Local verification evidence

- Backend: 12 tests passed, including five integration cases using an isolated local PostgreSQL schema; temporary server stopped afterward.
- Next production build and TypeScript passed using `build:next-only` and a harmless local database URL override; no production migration.
- Flutter: 11 account/profile tests passed, including existing lawyer-entry tests. New auth code/tests analyze without issues. Existing profile styling still has `withOpacity` deprecation infos; no analyzer errors or warnings.
- Both repository diff whitespace checks passed. No commit, push, deployment or real OTP delivery performed.
- iOS simulator build passed on the diagnostic rerun (`flutter build ios --simulator --no-codesign --verbose`, exit 0). First attempt failed with a generic SwiftCompile error; no speculative code changes were made between attempts. Physical-device email and secure-storage behavior remain unverified.
