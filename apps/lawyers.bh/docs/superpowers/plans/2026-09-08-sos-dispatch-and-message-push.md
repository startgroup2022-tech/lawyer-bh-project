# SOS Dispatch and Message Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-owned five-minute lawyer offers, automatic nearest-candidate progression, admin escalation, and bidirectional message push.

**Architecture:** Persist offer deadlines and transitions in PostgreSQL, run an idempotent expiry endpoint from Vercel Cron, and send privacy-safe FCM events after committed transitions. Flutter consumes authoritative deadlines and notification event types.

**Tech Stack:** Next.js route handlers, PostgreSQL, Firebase Admin, Vitest, Flutter, Firebase Messaging, flutter_local_notifications.

## Global Constraints

- Local implementation and verification only; do not push or deploy.
- The five-minute deadline is authoritative on the server.
- Never include message bodies or personal data in push payload data.
- Every transition and notification must be idempotent.

---

### Task 1: Push event contracts

**Files:**
- Modify: `lib/sos/mobile-push.ts`
- Test: `lib/sos/mobile-push.test.ts`

**Interfaces:**
- Produces: `lawyer_offer_expired` and `new_message` event payloads; message events accept a destination chosen by the caller.

- [ ] Write failing tests for localized offer, expired-offer, and new-message payloads and request/communication preference categories.
- [ ] Run the focused test and confirm the missing event types fail.
- [ ] Add minimal event types, localized copy, and category mapping.
- [ ] Run the focused test and confirm it passes.

### Task 2: Server-owned offer activation and expiry

**Files:**
- Modify: `lib/sos/live-dispatch-store.ts`
- Create: `lib/sos/offer-expiry.ts`
- Test: `lib/sos/offer-expiry.test.ts`
- Modify: `app/api/mobile/sos/requests/[requestId]/candidate/decision/route.ts`
- Test: `app/api/mobile/sos/requests/[requestId]/candidate/decision/route.test.ts`

**Interfaces:**
- Produces: `activateLawyerOffer({ bookingId, candidateId, now })` and `expireDueLawyerOffers({ now, limit })` returning committed transition records.

- [ ] Write failing tests proving no lawyer push occurs before client approval and approval creates exactly a five-minute deadline.
- [ ] Write failing tests proving expiry excludes the prior lawyer, is repeat-safe, and returns the nearest next candidate or escalation state.
- [ ] Run the tests and confirm failures identify missing transitions.
- [ ] Implement transactional activation and `FOR UPDATE SKIP LOCKED` expiry processing.
- [ ] Send lawyer offer only after activation; send expiry only from a committed expiry result.
- [ ] Run focused tests and confirm they pass.

### Task 3: Scheduled expiry and administration fallback

**Files:**
- Create: `app/api/cron/sos-offer-expiry/route.ts`
- Test: `app/api/cron/sos-offer-expiry/route.test.ts`
- Modify: `vercel.json`
- Modify: `lib/db/schema.ts`
- Create: `drizzle/0071_sos_offer_expiry_and_admin_escalation.sql`

**Interfaces:**
- Consumes: `expireDueLawyerOffers`.
- Produces: authenticated once-per-minute expiry endpoint and unique admin escalation records.

- [ ] Write failing tests for CRON authentication, expiry delivery, and one-time admin escalation.
- [ ] Add the migration, schema mapping, cron route, and minute schedule.
- [ ] Run route tests and migration contract checks.

### Task 4: Bidirectional chat push

**Files:**
- Modify: `app/api/mobile/communications/[requestId]/messages/route.ts`
- Test: `app/api/mobile/communications/[requestId]/messages/route.test.ts`

**Interfaces:**
- Consumes: resolved participant and mobile push sender.
- Produces: one `new_message` push to the opposite participant only after a newly inserted message.

- [ ] Write failing tests for client-to-lawyer, lawyer-to-client, duplicate submission, and push failure after persistence.
- [ ] Preserve insert idempotency and distinguish a newly inserted row from a conflict return.
- [ ] Send privacy-safe push to the opposite participant after commit.
- [ ] Run focused communication tests.

### Task 5: Flutter notification and countdown behavior

**Files:**
- Modify: `lib/services/mobile_notification_interaction.dart`
- Modify: `lib/features/lawyer/requests/screens/lawyer_requests_screen.dart`
- Test: `test/services/mobile_notification_interaction_test.dart`
- Test: `test/features/lawyer/requests/screens/lawyer_requests_screen_test.dart`

**Interfaces:**
- Consumes: `eventType`, `requestId`, and authoritative `lawyerResponseDeadline`.
- Produces: correct screen navigation and a countdown that reaches an expired state without inventing a new deadline.

- [ ] Write failing parsing/navigation tests for offer, expiry, and new-message events.
- [ ] Write a failing fake-clock countdown test using a server deadline exactly five minutes ahead.
- [ ] Implement event routing and deadline-based rendering.
- [ ] Run focused Flutter tests and analysis.

### Task 6: Local integration verification

**Files:**
- Verify all files above.

- [ ] Run all focused Vitest suites and `pnpm exec tsc --noEmit --incremental false`.
- [ ] Run all focused Flutter tests and targeted `flutter analyze`.
- [ ] Exercise the local flow with two app roles where available and record which physical push behavior still requires real devices/APNs.
- [ ] Confirm `git status` contains no unintended files and do not push or deploy.
