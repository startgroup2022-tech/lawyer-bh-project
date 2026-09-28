# Client Password and Signup Polish Implementation Plan

**Goal:** Implement the approved email/password login, email-verified signup and recovery, and polished autofill-friendly Flutter forms.

**Architecture:** Retain PostgreSQL-authoritative opaque sessions and email challenges. Store only salted scrypt password hashes. Each challenge binds its purpose and pending hash; reset requires email proof and revokes older sessions atomically. Flutter keeps passwords in form memory only, with OS autofill support.

**Tech Stack:** Next route handlers, PostgreSQL, Node crypto, Flutter and existing intl_phone_field.

## Constraints

- Preserve lawyer accounts, payments and guest request ownership. No production writes/deployments or real emails in tests.
- Register/reset passwords: 8–128 characters of any type, without composition requirements; do not trim them. Confirm password must match in the form. Login retains generic invalid-credentials errors.
- Existing accounts without a password use recovery. Old pending passwordless challenges cannot issue sessions.
- Signup against an existing account must not replace its password/profile. Reset must not create an account.
- Keep email OTP expiry, attempts and send limits. Add persisted login limits before password hashing.
- RTL, light/dark, centered title, hidden email/name counters, national phone picker, show/hide password, name/email/phone/new-password autofill.

## 1. Server contract and password storage

- [x] Add failing tests for required password, legacy login rejection, salted hashing and wrong passwords.
- [x] Add `password.ts` with asynchronous scrypt N=32768,r=8,p=3 and fixed-format digests; constant-time comparison and equal-cost missing-account checks.
- [x] Extend `validation.ts`, add migration 0048 password columns and challenge purpose; keep migration 0047 unchanged.
- [x] Add `login(email,password,ip)` to service and `/login` POST route. Gate costly hashing using committed email/IP limits; lock account while checking password/issuing session to serialize reset.
- [x] Bind register/reset challenge purpose and hash. Verify resets under account row lock; delete existing sessions before issuing new session. Reject legacy challenges.
- [x] Isolated PostgreSQL tests: signup, correct/wrong login, no plaintext, OTP replay, reset revocation, unknown account, existing signup protection and disabled account.

## 2. Flutter UI and API

- [x] Add failing form/API tests asserting five signup fields, two login fields, matching passwords, submitted credentials, recovery mode and no visible counters.
- [x] Add password-login API/repository/controller flow while preserving secure session storage and logout.
- [x] Introduce reset mode on the auth screen, email plus new password/confirmation followed by OTP. Add forgot-password navigation from login.
- [x] Center title/header, add branded icon container, themed outlined fields, spacing and full-width button. Provide autofill hints and keyboard next/done actions; no app-side plaintext password persistence.
- [x] Localize labels/errors in Arabic, English and Turkish. Save OS credentials only after successful server authentication.

## 3. Verification

- [x] Run backend auth suite using a dedicated temporary PostgreSQL database, then stop it.
- [x] Run Flutter auth/profile tests, analyzer, and backend production build without automatic migrations.
- [x] Record actual evidence and release requirements. No commit/push unless requested.

## Verified result

- Backend: 18 tests passed, including nine isolated PostgreSQL integration cases. Temporary database server stopped after tests.
- Flutter: 16 auth/profile tests passed. Separate light/dark layout and show/hide tests passed; previews inspected locally. OS autofill depends on the device/password manager and still requires physical-device verification.
- Next production build and TypeScript passed via `build:next-only`, without migrations. Whitespace checks passed in both repos.
- No production migration, deployment, credential changes or real emails sent. No native app rebuild performed for this UI-only Flutter change.

## Release checklist (not executed)

1. Apply migration 0048 through the normal migration process after checking pending migrations; it extends existing 0047 tables and must precede deployment of new auth code.
2. Preserve `CLIENT_AUTH_SECRET` and existing Postmark configuration; no new service needed.
3. Deploy backend, then distribute updated app. Old app versions using email-only login must update. Existing accounts without passwords use verified recovery.
4. Test signup email delivery, password login, recovery, session revocation and autofill on a physical device before release.
