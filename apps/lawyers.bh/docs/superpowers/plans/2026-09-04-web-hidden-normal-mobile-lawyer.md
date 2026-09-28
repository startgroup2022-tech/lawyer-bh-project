# Web-Hidden Normal Mobile Lawyer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Habib a normal mobile/SOS lawyer while hiding only his public website profile.

**Architecture:** Add a dedicated public-directory visibility column with a safe default of true. Public website queries require that flag; mobile and SOS paths continue to use normal operational eligibility and treat Habib as normal because the migration clears his review-account flag.

**Tech Stack:** PostgreSQL migrations, Drizzle ORM, Next.js 16, TypeScript, Vitest, Vercel/Neon Production.

## Global Constraints

- Habib must not appear anywhere in the public Arabic or English website directory.
- Habib must follow the same mobile directory, SOS distance, location, status, onboarding, payment, acceptance, notification, and payout rules as every normal lawyer.
- Other review accounts remain fully isolated.
- No hard-coded SOS routing, phone allowlist, payout bypass, or test-mode environment variable remains.
- Existing lawyers stay publicly visible by default.

---

### Task 1: Add the public-directory visibility field

**Files:**
- Create: `apps/lawyers.bh/drizzle/0057_public_directory_visibility.sql`
- Create: `apps/lawyers.bh/drizzle/verify_0057_public_directory_visibility.sql`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Modify: `apps/lawyers.bh/lib/db/schema.ts`

**Interfaces:**
- Produces: `schema.bahrainLawyers.isPublicDirectoryVisible: boolean` mapped to `is_public_directory_visible`.

- [ ] Add a failing schema/migration contract test asserting a non-null default-true field and an exact-ID migration update for Habib.
- [ ] Run the contract test and confirm the field/migration are missing.
- [ ] Add migration `0057` with `ADD COLUMN IF NOT EXISTS ... DEFAULT true NOT NULL`, then update exact UUID `3ee97030-bc1a-47c1-b06c-bd2b1acee637` to `is_review_account=false` and `is_public_directory_visible=false`.
- [ ] Add an idempotent verification SQL block and append journal index 50/tag `0057_public_directory_visibility`.
- [ ] Add the Drizzle field and index, then rerun the contract test.
- [ ] Commit with message `feat: separate web visibility from review isolation`.

### Task 2: Enforce website-only hiding

**Files:**
- Modify: `apps/lawyers.bh/lib/publicLawyers.ts`
- Modify: `apps/lawyers.bh/lib/lawyers/review-account-isolation-contract.test.ts`

**Interfaces:**
- Consumes: `schema.bahrainLawyers.isPublicDirectoryVisible`.
- Preserves: `getPublicLawyers()` and `getPublicLawyerBySlug()` contracts.

- [ ] Add a failing contract assertion that the public query requires `isPublicDirectoryVisible=true` while mobile/SOS files do not reference the field.
- [ ] Run the contract test and confirm failure.
- [ ] Add the visibility predicate beside the existing review-account predicate in `getPublicLawyers()`.
- [ ] Re-run and confirm the directory/isolation tests pass.
- [ ] Commit with message `feat: hide selected lawyers from public directory`.

### Task 3: Remove obsolete review test exceptions

**Files:**
- Delete: `apps/lawyers.bh/lib/sos/review-test-mode.ts`
- Delete: `apps/lawyers.bh/lib/sos/review-test-mode.test.ts`
- Delete: `apps/lawyers.bh/lib/lawyers/mobile-directory-review-visibility.ts`
- Delete: `apps/lawyers.bh/lib/lawyers/mobile-directory-review-visibility.test.ts`
- Modify: `apps/lawyers.bh/app/api/mobile/lawyers/route.ts`
- Modify: `apps/lawyers.bh/app/api/mobile/lawyers/route.test.ts`
- Modify: `apps/lawyers.bh/.env.example`

**Interfaces:**
- Restores: mobile directory includes active approved normal lawyers and excludes every review account without environment configuration.

- [ ] Change the mobile route test fixture so Habib is a normal lawyer and assert he appears without an allowlist while a review fixture stays hidden.
- [ ] Run the route test and confirm current fixture/config expectations fail.
- [ ] Restore the route query and defensive filter to unconditional review-account exclusion.
- [ ] Remove the obsolete helper modules and all three obsolete environment examples.
- [ ] Run mobile-directory, review isolation, SOS eligibility, polling, and acceptance tests.
- [ ] Commit with message `refactor: make Habib a normal mobile lawyer`.

### Task 4: Verify and deploy production migration

**Files:**
- Verify: all files above.

**Interfaces:**
- Production row: Habib UUID has `is_review_account=false`, `is_public_directory_visible=false`.

- [ ] Run all focused tests, the full test suite, `pnpm exec tsc --noEmit`, and the Node 22 production build with a syntactically valid build-only database URL.
- [ ] Inspect the production Habib row and Tap retailer onboarding state read-only before migration; report any normal-lawyer eligibility prerequisite that is missing.
- [ ] Push only the final feature commits onto the latest `PRODUCTION`; an authorized Vercel member triggers deployment.
- [ ] Confirm deployment `READY` and migration success.
- [ ] Remove obsolete Production variables `MOBILE_DIRECTORY_REVIEW_LAWYER_IDS`, `SOS_REVIEW_TEST_MODE`, and `SOS_REVIEW_TEST_LAWYER_ID` if present; this cloud deletion requires action-time confirmation.
- [ ] Verify live mobile API contains Habib and both public directories omit his identifiers.
- [ ] Verify lawyer login reports a normal account. A physical-device nearest-lawyer test must have Habib online, sharing a fresh location, and payout/onboarding-ready; selection is not guaranteed if another eligible lawyer is nearer.
