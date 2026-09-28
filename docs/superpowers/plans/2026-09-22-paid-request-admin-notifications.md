# Paid Request Admin Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send one durable email to `info@lawyers.bh` and push notifications to every eligible request administrator whenever a LegalSOS request first becomes paid and captured.

**Architecture:** A PostgreSQL transition trigger inserts one request-scoped outbox row. A focused worker claims email and push channels independently, sends through the existing Postmark and Firebase adapters, records each result independently, and retries incomplete channels from the existing SOS maintenance cron. The payment response never depends on provider delivery.

**Tech Stack:** PostgreSQL/Drizzle migrations, TypeScript, Next.js 16 route runtime, Postmark, Firebase Admin, Vitest.

## Global Constraints

- Notify only after `payment_status = 'success'` and `tap_status = 'CAPTURED'` first become true.
- Never backfill already-paid historical requests.
- Send email only to `info@lawyers.bh`.
- Push only to active administrators with `manage_requests`, an unexpired session, and a registered device.
- Email and push retries are independent and must not change the payment result.
- Never include access tokens, payment credentials, Tap payloads, chat content, attachments, or unnecessary personal data.

---

### Task 1: Durable Paid-Transition Outbox

**Files:**
- Create: `apps/lawyers.bh/drizzle/0108_paid_request_admin_notifications.sql`
- Create: `apps/lawyers.bh/drizzle/verify_0108_paid_request_admin_notifications.sql`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Modify: `apps/lawyers.bh/lib/db/schema.ts`
- Create: `apps/lawyers.bh/lib/mobile-admin/paid-request-outbox.integration.test.ts`

**Interfaces:**
- Produces table `mobile_admin_paid_request_outbox` with one row per `request_id` and independent `email_*` and `push_*` state.
- Produces trigger function `enqueue_paid_request_admin_notification()` on `bahrain_emergency_requests`.

- [ ] **Step 1: Write an isolated PostgreSQL integration test** that creates the minimum request table, applies migration `0108`, and asserts pending/cancelled updates create no row, the first `success` plus `CAPTURED` transition creates exactly one row, repeated updates remain one row, and a row already paid before trigger installation is not backfilled.
- [ ] **Step 2: Run the integration test against the local PostgreSQL instance and verify RED** because migration `0108` does not exist.
- [ ] **Step 3: Add migration, verification SQL, Drizzle schema, and journal entry** with channel status checks, per-channel attempts/next-at/lease/error/delivered fields, a unique request constraint, due indexes, and the transition trigger.
- [ ] **Step 4: Re-run the integration test and journal tests until GREEN.**
- [ ] **Step 5: Commit** migration, schema, journal, and integration test as `feat: enqueue paid request admin notifications`.

### Task 2: Independent Email and Push Delivery

**Files:**
- Create: `apps/lawyers.bh/lib/mobile-admin/paid-request-notifications.ts`
- Create: `apps/lawyers.bh/lib/mobile-admin/paid-request-notifications.test.ts`
- Create: `apps/lawyers.bh/lib/mobile-admin/paid-request-notification-store.ts`
- Create: `apps/lawyers.bh/lib/mobile-admin/paid-request-notification-store.test.ts`

**Interfaces:**
- Produces `drainPaidRequestAdminNotifications(deps, now, limit)` returning `{ claimed, emailDelivered, pushDelivered, retried }`.
- Produces `buildPaidRequestAdminEmail(event)` with `to: 'info@lawyers.bh'` and `buildPaidRequestAdminPush(event, locale)`.
- Produces `createPaidRequestNotificationStore(sql)` for channel-safe claims and conditional delivery/retry updates.

- [ ] **Step 1: Write failing behavior tests** proving the exact email recipient, approved summary fields, localized push payload, all eligible token delivery, token deduplication, independent channel success, retry backoff, terminal failure, and no email resend after email success plus push failure.
- [ ] **Step 2: Run both focused test files and verify RED** because the modules do not exist.
- [ ] **Step 3: Implement the pure builders and drain state machine** with bounded batches, eight attempts/24-hour terminal policy, per-locale Firebase chunks of 500, stale-token pruning, and sanitized error codes.
- [ ] **Step 4: Implement the SQL store** using `FOR UPDATE SKIP LOCKED`, independent channel leases, request summary selection, the existing administrator/session/device joins, and `manage_requests` filtering.
- [ ] **Step 5: Re-run the focused tests until GREEN and commit** as `feat: deliver paid request admin notifications`.

### Task 3: Production Adapters and Scheduling

**Files:**
- Create: `apps/lawyers.bh/lib/mobile-admin/paid-request-notification-runtime.ts`
- Create: `apps/lawyers.bh/lib/mobile-admin/paid-request-email.ts`
- Create: `apps/lawyers.bh/lib/mobile-admin/paid-request-email.test.ts`
- Modify: `apps/lawyers.bh/app/api/cron/sos-offer-expiry/route.ts`
- Modify: `apps/lawyers.bh/app/api/cron/sos-offer-expiry/route.test.ts`
- Modify: `apps/lawyers.bh/app/api/mobile/tap/payment-confirm/route.ts`
- Modify: `apps/lawyers.bh/app/api/mobile/tap/payment-confirm/route.test.ts`

**Interfaces:**
- Produces `runPaidRequestAdminNotifications({ now, limit })` wired to Postmark and Firebase.
- Consumes the durable outbox from Task 1 and drain contract from Task 2.

- [ ] **Step 1: Add failing cron tests** proving paid notifications drain even when offer expiry fails and their failure does not fail offer processing.
- [ ] **Step 2: Add a failing payment-confirm test** proving a captured payment schedules a best-effort drain after the response lifecycle and provider failure cannot change the successful payment response.
- [ ] **Step 3: Run the focused route tests and verify RED** because the runtime is not wired.
- [ ] **Step 4: Implement the Postmark adapter** calling existing `sendEmail` with the fixed recipient and implement the Firebase runtime with the established high-priority Android/APNs options.
- [ ] **Step 5: Wire the cron and Next.js `after()` payment-confirm callback**, catch/log only sanitized provider failures, and keep the outbox as the durable retry source.
- [ ] **Step 6: Run route, worker, Postmark, existing escalation, and payment regression suites until GREEN; commit** as `feat: schedule paid request admin alerts`.

### Task 4: Verification and Production Release

**Files:**
- Modify: `docs/superpowers/plans/2026-09-22-paid-request-admin-notifications.md` only to mark completed checkboxes.

**Interfaces:**
- Consumes all prior tasks.
- Produces verified Git refs, migration evidence, Vercel deployment evidence, and live delivery boundaries.

- [ ] **Step 1: Run focused Vitest suites, TypeScript, journal verification, and `git diff --check`.**
- [ ] **Step 2: Push `DEV` non-forcefully and verify the remote SHA.**
- [ ] **Step 3: Merge current `origin/DEV` into a clean `origin/PRODUCTION` worktree as `omaralnadeem-max <omaralnadeem@gmail.com>`, push non-forcefully, and verify the remote SHA.**
- [ ] **Step 4: Link the clean worktree to `gulf-international-collection-and-consulting/lawyers.bh`, deploy from monorepo root with Node 22, and confirm migration `0108`, production build, and Vercel `READY`.**
- [ ] **Step 5: Verify public/admin routes without credentials. Do not create a real charge automatically; record real Postmark and physical-device delivery as unverified unless the user supplies an approved paid test request and device evidence.**

