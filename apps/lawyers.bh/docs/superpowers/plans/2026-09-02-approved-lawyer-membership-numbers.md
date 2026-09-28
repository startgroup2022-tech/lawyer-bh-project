# Approved Lawyer Membership Numbers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backfill official numbers for historical approved lawyers and display newly allocated numbers immediately after approval.

**Architecture:** Keep sequence allocation server-owned, add a database invariant after a deterministic backfill, and isolate the client-state merge in a pure tested helper.

**Tech Stack:** Next.js 16, React 19, TypeScript, PostgreSQL/Drizzle, Vitest.

## Global Constraints

- Preserve every existing membership number.
- Backfill approved rows only.
- Use the official Bahrain membership sequence and `LBH-000000` format.
- Do not deploy or migrate production during local implementation.

---

### Task 1: Client Approval State

**Files:**
- Create: `apps/lawyers.bh/app/[locale]/admin/approvals/approval-state.ts`
- Test: `apps/lawyers.bh/app/[locale]/admin/approvals/approval-state.test.ts`
- Modify: `apps/lawyers.bh/app/[locale]/admin/approvals/Content.tsx`

**Interfaces:**
- Produces: `mergeApprovedMembership(items, id, membershipNo)`.

- [ ] Write failing tests for applying the returned number only to the matching item and preserving an existing number when the response omits it.
- [ ] Implement the pure helper and verify the tests pass.
- [ ] Add `membershipNo` to the approval response type and use the helper in the successful state update.

### Task 2: Membership Formatting and Database Invariant

**Files:**
- Create: `apps/lawyers.bh/lib/provider/membership-number.ts`
- Test: `apps/lawyers.bh/lib/provider/membership-number.test.ts`
- Modify: `apps/lawyers.bh/app/api/admin/provider-applications/[id]/approve/route.ts`
- Create: `apps/lawyers.bh/drizzle/0055_backfill_approved_membership_numbers.sql`
- Create: `apps/lawyers.bh/drizzle/verify_0055_backfill_approved_membership_numbers.sql`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Modify: `apps/lawyers.bh/lib/db/schema.ts`

**Interfaces:**
- Produces: `formatMembershipNumber(countryCode, sequenceValue)` and database constraint `bahrain_lawyers_approved_membership_no_check`.

- [ ] Write a failing formatting test with literal Bahrain output and invalid-value rejection.
- [ ] Implement and use the formatter in the approval route.
- [ ] Add the locked sequence-alignment backfill and approved-membership check constraint.
- [ ] Add verification SQL for missing and duplicate approved membership numbers.
- [ ] Run focused tests, full tests, TypeScript, changed-file ESLint, and `git diff --check`.
