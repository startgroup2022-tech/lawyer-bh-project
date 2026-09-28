# Lawyer Commission Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 20% platform commission for a lawyer's first approved year and 45% afterward while retaining immutable per-payment snapshots.

**Architecture:** Keep the existing effective-dated commission schedule and payment-allocation snapshot model. Change the second schedule row to 45/55, migrate only active schedule rows, keep `reviewed_at` as the durable origin, and update all registration contract/API representations.

**Tech Stack:** Next.js 16, TypeScript, PostgreSQL, postgres-js/Drizzle migrations, Vitest.

## Global Constraints

- The first year begins at the durable lawyer approval timestamp and ends at its one-year anniversary.
- Platform/lawyer percentages are 20/80 before the anniversary and 45/55 at and after it.
- Existing `bahrain_payment_allocations` rows and their percentage/amount snapshots must never be changed.
- Do not apply migrations to production and do not deploy.

---

### Task 1: Lock the schedule and contract behavior with failing tests

**Files:**
- Modify: `lib/payments/commission-sql.test.ts`
- Create: `lib/payments/commission-contract.test.ts`

**Interfaces:**
- Consumes: `createDefaultProviderCommissionRates()` and source contract/API files.
- Produces: Regression expectations for 20/80, 45/55, anniversary SQL, agreement wording, API response, and migration safety.

- [ ] Add tests asserting the generated schedule binds `20.00`, `80.00`, `45.00`, and `55.00` and uses a non-overlapping one-year boundary.
- [ ] Add source-contract tests asserting both agreement surfaces and the approval response contain 45/55, and that migration SQL updates rates but never `bahrain_payment_allocations`.
- [ ] Run the focused tests and confirm they fail on the current 50/50/static agreement implementation.

### Task 2: Implement the schedule and agreement changes

**Files:**
- Modify: `lib/payments/commission.ts`
- Modify: `app/api/admin/provider-applications/[id]/approve/route.ts`
- Modify: `app/[locale]/join/Content.tsx`
- Modify: `app/[locale]/complete-profile/Content.tsx`

**Interfaces:**
- Consumes: durable `reviewedAt`, existing effective-dated rate creation, and payment capture allocation.
- Produces: second-year constants/API output of 45/55 and identical bilingual contractual copy on both signing surfaces.

- [ ] Change second-year schedule constants and comments from 50/50 to 45/55.
- [ ] Change the approval API representation to 45/55 while preserving `provider.reviewedAt ?? durableApprovedAt`.
- [ ] Replace the static 20% agreement sentence in both forms with exact bilingual first-year/second-year wording.
- [ ] Run focused tests and confirm they pass.

### Task 3: Add the forward-only schedule migration

**Files:**
- Create: `drizzle/0056_update_lawyer_commission_schedule.sql`
- Create: `drizzle/verify_0056_update_lawyer_commission_schedule.sql`
- Modify: `drizzle/meta/_journal.json`

**Interfaces:**
- Consumes: `bahrain_lawyers.reviewed_at` and `bahrain_provider_commission_rates`.
- Produces: active 20/80 first-year and 45/55 second-year rows anchored to the stored approval time; historical allocations remain untouched.

- [ ] Add idempotent SQL that updates/inserts the two active effective periods for approved lawyers with `reviewed_at`.
- [ ] Restrict updates to commission schedule rows and include no write against `bahrain_payment_allocations`.
- [ ] Add verification SQL for missing/overlapping periods, wrong percentages, wrong anniversary boundaries, and unexpected allocation changes by omission.
- [ ] Add journal entry `0056_update_lawyer_commission_schedule`.
- [ ] Run focused migration contract tests.

### Task 4: Full verification and scope audit

**Files:**
- Review all modified files above.

**Interfaces:**
- Consumes: completed implementation.
- Produces: fresh local evidence without database migration or deployment.

- [ ] Run focused commission and contract tests.
- [ ] Run the full Vitest suite.
- [ ] Run ESLint on changed TypeScript/TSX test and source files.
- [ ] Run `pnpm run build:next-only` with safe local environment values if required; never run the migration-bearing `pnpm build`.
- [ ] Run `git diff --check`, inspect `git status --short`, and verify no unrelated changes, production data changes, deployment, or historical allocation updates occurred.
