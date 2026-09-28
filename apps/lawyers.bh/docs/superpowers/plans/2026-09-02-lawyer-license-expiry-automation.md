# Lawyer License Expiry Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Email each eligible Bahrain lawyer 30 and 7 days before license expiry, then deactivate and hide the lawyer on the expiry date.

**Architecture:** A daily authenticated Vercel cron route calls a focused license-maintenance service. Pure date and message functions stay independent from database orchestration; a notification ledger provides concurrency-safe idempotency and retry tracking.

**Tech Stack:** Next.js 16 route handlers, TypeScript, Drizzle/PostgreSQL, Postmark, Vitest, Vercel Cron.

## Global Constraints

- Use Bahrain calendar dates for every threshold comparison.
- Send exactly one successful reminder per lawyer, expiry date, and threshold.
- Email failure never prevents expiry deactivation or processing another lawyer.
- Do not automatically reactivate renewed accounts.
- Do not alter requests, payments, earnings, or uploaded documents.
- Do not deploy or migrate production as part of local implementation.

---

### Task 1: Pure Date and Email Behavior

**Files:**
- Create: `apps/lawyers.bh/lib/provider/license-expiry-maintenance.ts`
- Test: `apps/lawyers.bh/lib/provider/license-expiry-maintenance.test.ts`

**Interfaces:**
- Produces: `bahrainDateFromInstant(now: Date): string`, `classifyLicenseDate(runDate: string, expiryDate: string | null): "expired" | "30_days" | "7_days" | null`, and `buildLicenseExpiryReminder(input): SendEmailInput`.

- [ ] Write tests with literal expectations for Bahrain midnight boundaries, 30-day and 7-day thresholds, expiry-day and overdue classification, Arabic/English subjects and bodies, and escaped names.
- [ ] Run `pnpm test -- lib/provider/license-expiry-maintenance.test.ts` and verify failure because the module does not exist.
- [ ] Implement the minimal pure functions and typed reminder input.
- [ ] Re-run the focused test and verify all cases pass.
- [ ] Run changed-file ESLint and commit the test plus implementation.

### Task 2: Notification Ledger Migration and Schema

**Files:**
- Create: `apps/lawyers.bh/drizzle/0054_lawyer_license_notifications.sql`
- Create: `apps/lawyers.bh/drizzle/verify_0054_lawyer_license_notifications.sql`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Modify: `apps/lawyers.bh/lib/db/schema.ts`

**Interfaces:**
- Produces: `lawyerLicenseNotifications` with lawyer ID, expiry date, reminder kind, attempt count, last error, claimed timestamp, sent timestamp, and unique `(lawyer_id, license_expiry_date, reminder_kind)`.

- [ ] Add the Drizzle table declaration and a schema-contract test asserting the exported table's column names and unique key.
- [ ] Run the schema-contract test and verify failure because the table export is missing.
- [ ] Add migration SQL, journal entry, verification SQL, foreign key, check constraint, and indexes.
- [ ] Re-run the schema-contract test and `git diff --check`.
- [ ] Commit the migration and schema declaration.

### Task 3: Database Maintenance Job

**Files:**
- Create: `apps/lawyers.bh/lib/provider/license-expiry-job.ts`
- Test: `apps/lawyers.bh/lib/provider/license-expiry-job.test.ts`

**Interfaces:**
- Consumes: `classifyLicenseDate`, `buildLicenseExpiryReminder`, and `sendEmail`.
- Produces: `runLicenseExpiryMaintenance({ runDate, store, deliver }): Promise<{ deactivated: number; remindersSent: number; remindersFailed: number }>` and an injected store contract for selecting, claiming, completing, failing, and deactivating records.

- [ ] Write failing behavior tests for expiry-day and overdue deactivation, unrelated-suspension preservation, 30/7-day delivery, duplicate-success suppression, failed-delivery retry, renewed-date isolation, and continuation after one email failure.
- [ ] Run the focused test and verify it fails because the job is absent.
- [ ] Implement the injected orchestration and PostgreSQL store with atomic reminder claims.
- [ ] Re-run the focused tests until all pass.
- [ ] Run changed-file ESLint and commit the job.

### Task 4: Protected Cron Route and Schedule

**Files:**
- Create: `apps/lawyers.bh/app/api/cron/lawyer-license-expiry/route.ts`
- Test: `apps/lawyers.bh/app/api/cron/lawyer-license-expiry/route.test.ts`
- Modify: `apps/lawyers.bh/vercel.json`

**Interfaces:**
- Consumes: `runLicenseExpiryMaintenance` and `CRON_SECRET`.
- Produces: authenticated `GET /api/cron/lawyer-license-expiry` returning only aggregate counts.

- [ ] Write route tests proving missing/wrong bearer credentials return 401 without running the job and valid credentials return sanitized counts.
- [ ] Run the route test and verify failure because the route is absent.
- [ ] Implement constant-time-safe bearer validation, Bahrain run-date calculation, job invocation, and generic 500 handling.
- [ ] Add daily `15 21 * * *` schedule, corresponding to 00:15 Bahrain time year-round.
- [ ] Re-run route tests and changed-file ESLint.
- [ ] Commit the route and schedule.

### Task 5: Full Verification

**Files:**
- Review every file changed since the design commit.

**Interfaces:**
- Verifies the complete feature contract without production mutation.

- [ ] Run all new focused tests together and confirm zero failures.
- [ ] Run the relevant existing public-directory and provider-access tests.
- [ ] Run `pnpm exec tsc --noEmit` and changed-file ESLint.
- [ ] Run `pnpm build:next-only` without applying migrations.
- [ ] Run `git diff --check`, inspect the final diff, and confirm no unrelated files changed.
- [ ] Record any baseline or environment-only failure precisely; do not claim deployment or production migration.
