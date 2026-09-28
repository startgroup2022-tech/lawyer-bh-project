# Global Review SOS Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Habib to the normal nearest-lawyer SOS pool during an explicit temporary test mode, and let only that review account poll and accept its own captured-payment cases without generating payouts.

**Architecture:** A server-only policy parses the two fail-closed environment settings and provides the sole review-SOS exception. Candidate selection, polling, and acceptance consume that policy independently while preserving their current payment, ownership, deadline, and distance checks.

**Tech Stack:** Next.js 16, TypeScript, Drizzle ORM, postgres-js tagged SQL, Vitest, Vercel Production environment variables.

## Global Constraints

- Real eligible lawyers stay in the candidate pool while test mode is enabled.
- Only review lawyer `3ee97030-bc1a-47c1-b06c-bd2b1acee637` may join that pool.
- Selection remains based on the existing nearest-lawyer ranking.
- Review access always requires `payment_status = 'success'` and `tap_status = 'CAPTURED'`.
- The review lawyer never creates provider or delayed payout allocation.
- Missing or malformed configuration restores full review isolation.
- Public website and ordinary mobile directory behavior remain unchanged.

---

### Task 1: Central review SOS test-mode policy

**Files:**
- Create: `apps/lawyers.bh/lib/sos/review-test-mode.ts`
- Create: `apps/lawyers.bh/lib/sos/review-test-mode.test.ts`

**Interfaces:**
- Produces: `getReviewSosTestLawyerId(environment?: NodeJS.ProcessEnv): string | null`.
- Produces: `canReviewLawyerUseSos(input: { lawyerId: string; isReviewAccount: boolean }, environment?: NodeJS.ProcessEnv): boolean`.

- [ ] Write tests proving exact `true` enablement, UUID validation, fail-closed missing values, exact-ID matching, normal-account rejection, and other-review rejection.
- [ ] Run `pnpm exec vitest run lib/sos/review-test-mode.test.ts --reporter=verbose` and confirm failure because the module is absent.
- [ ] Implement the minimal pure policy with trimmed lowercase values and a UUID validator.
- [ ] Re-run the test and confirm all cases pass.
- [ ] Commit with message `feat: add review SOS test-mode policy`.

### Task 2: Add Habib to nearest candidate selection

**Files:**
- Modify: `apps/lawyers.bh/lib/sos/live-dispatch-store.ts`
- Create: `apps/lawyers.bh/lib/sos/live-dispatch-store.contract.test.ts`

**Interfaces:**
- Consumes: `getReviewSosTestLawyerId()`.
- Preserves: `getOrSelectCandidate()` and `PaidMobileBooking` public contracts.

- [ ] Write a failing contract test against a factored exported candidate eligibility helper proving normal lawyers remain eligible, configured Habib becomes eligible, and other review accounts remain excluded.
- [ ] Run the new test and confirm the helper is missing.
- [ ] Add `isCandidateAllowedByReviewMode({ id, isReviewAccount }, configuredReviewLawyerId)` and use it defensively after the query.
- [ ] Change candidate SQL from an inner to a left onboarding join, select `is_review_account`, and allow normal lawyers plus the exact configured review UUID when enabled.
- [ ] Treat the exact configured review account as payout-ready for ranking only; keep the real-lawyer onboarding check unchanged. Preserve active, approved, emergency-ready, location, freshness, radius, and distance ranking.
- [ ] Run the new policy/store tests plus `lib/sos/live-dispatch.test.ts` and confirm all pass.
- [ ] Commit with message `feat: include review lawyer in SOS candidate ranking`.

### Task 3: Permit isolated polling for configured Habib

**Files:**
- Modify: `apps/lawyers.bh/app/api/sos/lawyer/pickups/check/route.ts`
- Modify: `apps/lawyers.bh/app/api/sos/lawyer/pickups/check/route.test.ts`

**Interfaces:**
- Consumes: `canReviewLawyerUseSos()`.
- Preserves: the existing pickup JSON response.

- [ ] Add failing tests proving configured Habib proceeds to captured candidate/active-case queries while another review lawyer returns the empty isolated response.
- [ ] Run the route test and confirm configured Habib still exits early.
- [ ] Replace the blanket review early return with the central exact-ID policy; leave all query predicates unchanged.
- [ ] Re-run and confirm the polling tests pass.
- [ ] Commit with message `feat: allow test review lawyer SOS polling`.

### Task 4: Permit acceptance without payout

**Files:**
- Modify: `apps/lawyers.bh/app/api/sos/lawyer/case/[caseRef]/accept/route.ts`
- Modify: `apps/lawyers.bh/app/api/sos/lawyer/case/[caseRef]/accept/route.test.ts`

**Interfaces:**
- Consumes: `canReviewLawyerUseSos()`.
- Preserves: existing acceptance state transitions and response contract.

- [ ] Extend the route fixture to model a captured current candidate and mock update/returning plus `recordPaymentAllocation`.
- [ ] Add failing tests proving configured Habib can accept its own captured offer, another review lawyer is rejected before request lookup, failed payment stays rejected, and the Habib path never calls payout allocation.
- [ ] Run the route test and confirm configured Habib receives `review_account_isolated`.
- [ ] Replace the blanket review rejection with the exact-ID test-mode policy.
- [ ] Skip `ensureEmergencyAllocation` for the permitted review lawyer in both repaired and new-acceptance branches; leave allocation unchanged for real lawyers.
- [ ] Re-run and confirm all acceptance tests pass.
- [ ] Commit with message `feat: allow isolated review SOS acceptance`.

### Task 5: Configure, verify, and deploy

**Files:**
- Modify: `apps/lawyers.bh/.env.example`
- Verify: `apps/lawyers.bh/lib/admin/mobile-notifications/store.ts`
- Verify: `apps/lawyers.bh/lib/publicLawyers.ts`

**Interfaces:**
- Production settings: `SOS_REVIEW_TEST_MODE=true` and `SOS_REVIEW_TEST_LAWYER_ID=3ee97030-bc1a-47c1-b06c-bd2b1acee637`.

- [ ] Document both temporary server-only settings and the required pre-release rollback in `.env.example`.
- [ ] Run focused policy, dispatch, polling, acceptance, directory isolation, and notification tests.
- [ ] Run `pnpm test`, retrying only a demonstrated timeout test individually with an explicit longer timeout; report any remaining failure.
- [ ] Run `pnpm exec tsc --noEmit` and `DATABASE_URL=postgres://build:build@127.0.0.1:5432/build pnpm run build:next-only` with Node 22.
- [ ] Commit with message `docs: configure temporary review SOS mode`.
- [ ] Add the two settings to Vercel Production, push only these feature commits onto the latest `PRODUCTION`, and have an authorized project member trigger deployment.
- [ ] Verify the deployment is `READY`; then verify a safe live polling call remains authenticated and that website directories still omit Habib.
- [ ] Before App Store publication, set `SOS_REVIEW_TEST_MODE=false` or remove both variables, redeploy, and verify Habib again receives no pickups.
