# Provider Profile Change Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let providers edit every supported profile field while applying ordinary changes immediately and holding sensitive changes for administrator approval without replacing active data.

**Architecture:** Keep `bahrain_lawyers` authoritative and add one auditable request table containing proposed sensitive scalars and request-only file references. Provider APIs return approved values plus a safe pending projection; administrator endpoints atomically approve or reject a pending request. Existing expired-license renewal remains isolated.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM/PostgreSQL, Vitest, Vercel Blob.

## Global Constraints

- Approved values remain active in public, payment, dispatch, and dashboard identity views until approval.
- A normal pending profile change never changes provider `status`, `is_active`, approval metadata, Tap state, or eligibility.
- Expired-license renewal keeps its existing account-locking behavior.
- Administrator operations require `manage_approvals`; protected files never expose blob paths or Base64 in browser payloads.
- Tests precede production changes and local verification is reported separately from migration, deployment, and production status.

---

### Task 1: Persistence and pure change policy

**Files:**
- Create: `drizzle/0059_provider_profile_change_requests.sql`
- Create: `drizzle/verify_0059_provider_profile_change_requests.sql`
- Modify: `lib/db/schema.ts`
- Create: `lib/provider/profile-change-policy.ts`
- Create: `lib/provider/profile-change-policy.test.ts`

**Interfaces:**
- Produces `ProviderProfileChangeValues`, `diffSensitiveProfileValues(current, submitted)`, `mergePendingProfileValues(current, patch)`, and `hasProfileChanges(values)`.
- Produces `schema.providerProfileChangeRequests` with one partial-unique pending row per `(provider_id, country_code)`.

- [ ] Write failing table-driven tests proving unchanged sensitive values are omitted, normalized differences are retained, a pending patch can remove a proposal by matching the approved value, and empty requests are detected.
- [ ] Run `pnpm test -- lib/provider/profile-change-policy.test.ts`; expect failure because the policy module does not exist.
- [ ] Implement the typed allowlist and deterministic comparison/merge functions with no database or upload dependencies.
- [ ] Run the focused test and expect all policy cases to pass.
- [ ] Add the enum/table/index migration, schema mapping, and a verification query that asserts table, statuses, foreign key, and partial unique index.
- [ ] Run `pnpm exec tsc --noEmit` and `git diff --check`.

### Task 2: Provider read/save contract and protected proposed files

**Files:**
- Create: `lib/provider/profile-change-validation.ts`
- Create: `lib/provider/profile-change-validation.test.ts`
- Modify: `app/api/provider/me/route.ts`
- Modify: `app/api/provider/profile/route.ts`
- Create: `app/api/provider/profile-change/file/[kind]/route.ts`
- Create: `app/api/provider/profile-change/file/[kind]/route.test.ts`

**Interfaces:**
- Consumes the Task 1 change types and request table.
- Produces `pendingProfileChange` with safe scalars, filenames, status, timestamps, and rejection reason; accepted file kinds are `profile`, `license`, `iban`, `institution`, `personal-id`, and `signature`.

- [ ] Write failing validation tests for normalized sensitive scalars, future license expiry, supported file type/size, paired IBAN evidence, and paired license evidence.
- [ ] Run focused tests and confirm failures are caused by the missing validator.
- [ ] Implement validation with stable codes such as `PROFILE_CHANGE_INVALID`, `IBAN_CERTIFICATE_REQUIRED`, `LICENSE_FILE_REQUIRED`, `FILE_TOO_LARGE`, and `FILE_TYPE_INVALID`.
- [ ] Write failing route tests proving the protected file endpoint requires the owning provider session and never returns internal paths.
- [ ] Implement provider-safe request projection and protected file streaming.
- [ ] Write route/service tests proving direct-only edits update `bahrain_lawyers`, sensitive-only edits leave it unchanged, mixed edits split correctly, pending edits merge, and matching approved values cancel the pending request.
- [ ] Implement request-specific uploads followed by a transaction that applies direct values and upserts/cancels the pending request; preserve the existing `action=update_license` branch.
- [ ] Extend `/api/provider/me` and PATCH responses with approved editable fields and pending/rejected summaries.
- [ ] Run all Task 1-2 focused tests, TypeScript, and `git diff --check`.

### Task 3: Administrator review APIs and protected comparison files

**Files:**
- Create: `lib/provider/profile-change-review.ts`
- Create: `lib/provider/profile-change-review.test.ts`
- Create: `app/api/admin/provider-profile-changes/[id]/approve/route.ts`
- Create: `app/api/admin/provider-profile-changes/[id]/reject/route.ts`
- Create: `app/api/admin/provider-profile-changes/[id]/file/[version]/[kind]/route.ts`
- Create: `app/api/admin/provider-profile-changes/[id]/file/[version]/[kind]/route.test.ts`

**Interfaces:**
- Produces `approveProviderProfileChange(id, reviewerId)` and `rejectProviderProfileChange(id, reviewerId, reason)`.
- `version` is exactly `current` or `proposed`; file kinds match Task 2.

- [ ] Write failing service tests proving approval applies the full snapshot once, rejects a non-pending request with conflict, preserves provider status/activation/Tap fields, and records reviewer metadata atomically.
- [ ] Implement approval using a row lock and one database transaction.
- [ ] Write failing rejection tests proving a reason is mandatory and approved provider data never changes.
- [ ] Implement rejection and stable response codes.
- [ ] Write protected file route tests for permission denial, invalid version/kind, missing files, and safe content streaming.
- [ ] Implement routes guarded by `manage_approvals` without exposing raw storage fields.
- [ ] Run the Task 3 focused tests, TypeScript, and `git diff --check`.

### Task 4: Provider full-profile editor

**Files:**
- Modify: `app/[locale]/provider-dashboard/Content.tsx`
- Create: `app/[locale]/provider-dashboard/profile-presentation.ts`
- Create: `app/[locale]/provider-dashboard/profile-presentation.test.ts`

**Interfaces:**
- Consumes approved provider fields and `pendingProfileChange` from Task 2.
- Produces localized status labels and proposed-value display helpers used by the dashboard.

- [ ] Write failing presentation tests for Arabic/English pending badges, rejection reasons, approved-versus-proposed display, and direct/sensitive field labels.
- [ ] Implement the small pure presentation module.
- [ ] Expand the profile form to include experience, working hours, roles, registration details, IBAN, license, profile image, personal ID, institution data, and signature while preserving specialties and expired-license renewal.
- [ ] Render approved values as active and proposed differences alongside them; mark sensitive controls as requiring review.
- [ ] After save, show separate localized confirmations for immediate changes and queued review changes, then refresh `/api/provider/me`.
- [ ] Run the presentation tests, TypeScript, ESLint on changed files, and `git diff --check`.

### Task 5: Administrator profile-change review screen

**Files:**
- Create: `app/[locale]/admin/approvals/profile-changes/page.tsx`
- Create: `app/[locale]/admin/approvals/profile-changes/Content.tsx`
- Create: `app/[locale]/admin/approvals/profile-changes/presentation.ts`
- Create: `app/[locale]/admin/approvals/profile-changes/presentation.test.ts`
- Modify: `app/[locale]/admin/approvals/Content.tsx`

**Interfaces:**
- Consumes Task 3 review routes and protected comparison file URLs.
- Produces pending/approved/rejected filters and side-by-side current/proposed rows.

- [ ] Write failing presentation tests proving only changed fields appear, sensitive values are formatted safely, and Arabic/English labels cover every permitted key.
- [ ] Implement safe server projection and presentation helpers.
- [ ] Build the review list with provider identity, timestamps, comparisons, protected files, and decision history.
- [ ] Wire approval confirmation and rejection with a mandatory reason; refresh only the decided item from the returned response.
- [ ] Add a visible navigation entry from the existing approvals screen.
- [ ] Run focused tests, TypeScript, ESLint on changed files, and `git diff --check`.

### Task 6: Verified provider email change

**Files:**
- Create: `drizzle/0060_provider_email_change_challenges.sql`
- Modify: `lib/db/schema.ts`
- Create: `lib/provider/email-change.ts`
- Create: `lib/provider/email-change.test.ts`
- Create: `app/api/provider/email-change/request/route.ts`
- Create: `app/api/provider/email-change/verify/route.ts`
- Modify: `app/[locale]/provider-dashboard/Content.tsx`

**Interfaces:**
- Produces request and verification routes with `EMAIL_CHANGE_CODE_SENT`, `EMAIL_CHANGE_CODE_INVALID`, `EMAIL_CHANGE_CODE_EXPIRED`, and `EMAIL_ALREADY_USED` outcomes.

- [ ] Write failing tests for normalized unique email, hashed six-digit codes, expiry, attempt limits, one-time verification, and unchanged provider email before success.
- [ ] Implement short-lived challenges and transactional one-time verification using the existing mail delivery abstraction.
- [ ] Add the two-step localized email UI without sending email through the general profile PATCH.
- [ ] Run focused tests, TypeScript, ESLint on changed files, and `git diff --check`.

### Task 7: Regression and visual verification

**Files:**
- Modify tests only when a verified regression requires coverage.

**Interfaces:**
- Verifies the complete feature; produces no new runtime API.

- [ ] Run all provider profile, approval, public directory, Tap/payment projection, dispatch projection, and expired-license tests.
- [ ] Run `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm run build:next-only` using Node 22.
- [ ] Apply migration SQL only to an isolated local test database if configured; do not touch Preview or Production databases.
- [ ] Walk through provider save/pending/rejection/approval and admin comparison flows in a browser in Arabic and English, including mobile width.
- [ ] Review `git diff`, `git diff --check`, and `git status --short`; report tests, build, browser evidence, migration state, deployment state, and production state separately.
