# Mobile Review Lawyer Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the explicitly allowlisted Habib Mohammed review lawyer in the LegalSOS mobile directory while preserving all website and SOS isolation.

**Architecture:** A focused policy module parses a fail-closed UUID allowlist from `MOBILE_DIRECTORY_REVIEW_LAWYER_IDS` and decides whether a directory row is visible. The mobile route applies the policy in both its Drizzle query and its response filter; no other consumer imports the policy.

**Tech Stack:** Next.js 16 route handlers, TypeScript, Drizzle ORM, Vitest, Vercel environment configuration.

## Global Constraints

- Only `GET /api/mobile/lawyers` may allow an explicitly listed review account.
- Public website queries and every SOS boundary must continue to exclude all review accounts.
- Missing, empty, invalid, or malformed configuration must fail closed.
- Internal `isReviewAccount` data must not appear in the API response.
- No database migration or Flutter change is required.

---

### Task 1: Mobile directory review-account visibility policy

**Files:**
- Create: `apps/lawyers.bh/lib/lawyers/mobile-directory-review-visibility.ts`
- Create: `apps/lawyers.bh/lib/lawyers/mobile-directory-review-visibility.test.ts`

**Interfaces:**
- Consumes: raw `MOBILE_DIRECTORY_REVIEW_LAWYER_IDS` environment string.
- Produces: `getMobileDirectoryReviewLawyerIds(rawValue: string | undefined): string[]` and `isMobileDirectoryLawyerVisible(lawyer: { id: string; isReviewAccount: boolean }, allowlistedIds: ReadonlySet<string>): boolean`.

- [ ] **Step 1: Write failing policy tests**

Add literal cases proving comma-separated UUID parsing, whitespace removal,
deduplication, rejection of invalid entries, fail-closed missing configuration,
normal-lawyer visibility, allowlisted review-lawyer visibility, and unlisted
review-lawyer exclusion.

- [ ] **Step 2: Run the policy test and confirm RED**

Run: `pnpm test -- lib/lawyers/mobile-directory-review-visibility.test.ts`

Expected: FAIL because the policy module does not exist.

- [ ] **Step 3: Implement the minimal policy**

Use an exact lowercase UUID regular expression, normalize UUIDs to lowercase,
return a deduplicated array, and make the visibility predicate return true for
normal accounts or exact allowlist membership for review accounts.

- [ ] **Step 4: Run the policy test and confirm GREEN**

Run: `pnpm test -- lib/lawyers/mobile-directory-review-visibility.test.ts`

Expected: all policy cases PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/lawyers.bh/lib/lawyers/mobile-directory-review-visibility.ts apps/lawyers.bh/lib/lawyers/mobile-directory-review-visibility.test.ts
git commit -m "feat: add mobile review lawyer visibility policy"
```

### Task 2: Apply the policy to the mobile directory

**Files:**
- Modify: `apps/lawyers.bh/app/api/mobile/lawyers/route.ts`
- Modify: `apps/lawyers.bh/app/api/mobile/lawyers/route.test.ts`
- Modify: `apps/lawyers.bh/.env.example`

**Interfaces:**
- Consumes: the two policy exports from Task 1 and `process.env.MOBILE_DIRECTORY_REVIEW_LAWYER_IDS`.
- Produces: the unchanged mobile directory JSON contract with an allowlisted review lawyer included.

- [ ] **Step 1: Write failing route tests**

Update the fixtures to use valid literal UUIDs. Add isolated environment setup
and cleanup. Prove that the Habib UUID is returned only when allowlisted, an
unlisted review UUID is omitted, the internal marker is stripped, and an empty
environment value returns only the normal lawyer.

- [ ] **Step 2: Run the route test and confirm RED**

Run: `pnpm test -- app/api/mobile/lawyers/route.test.ts`

Expected: FAIL because the current query and defensive filter always exclude
the allowlisted review account.

- [ ] **Step 3: Implement the route query and defensive filter**

Parse the environment once per request. Build the Drizzle condition as normal
accounts only when the allowlist is empty; otherwise allow either a normal
account or a review account whose ID is in the parsed list. Reuse the visibility
predicate on returned rows before stripping `isReviewAccount`.

- [ ] **Step 4: Document the server setting**

Add a commented `.env.example` entry explaining that the comma-separated UUID
allowlist is temporary, mobile-directory-only, and empty by default.

- [ ] **Step 5: Run focused and isolation tests**

Run:

```bash
pnpm test -- app/api/mobile/lawyers/route.test.ts lib/lawyers/mobile-directory-review-visibility.test.ts lib/lawyers/review-account-isolation-contract.test.ts app/api/sos/lawyer/pickups/check/route.test.ts
```

Expected: all focused tests PASS. If the isolation contract currently asserts
that mobile review accounts are never visible, replace only that obsolete
assertion with a contract proving the allowlist policy is imported solely by
the mobile route; keep every website and SOS assertion unchanged.

- [ ] **Step 6: Commit**

```bash
git add apps/lawyers.bh/app/api/mobile/lawyers/route.ts apps/lawyers.bh/app/api/mobile/lawyers/route.test.ts apps/lawyers.bh/lib/lawyers/review-account-isolation-contract.test.ts apps/lawyers.bh/.env.example
git commit -m "feat: show allowlisted review lawyer in mobile directory"
```

### Task 3: Verify and activate production visibility

**Files:**
- Verify only: `apps/lawyers.bh/lib/publicLawyers.ts`
- Verify only: `apps/lawyers.bh/lib/sos/live-dispatch-store.ts`
- Verify only: `apps/lawyers.bh/lib/admin/mobile-notifications/store.ts`

**Interfaces:**
- Consumes: production setting `MOBILE_DIRECTORY_REVIEW_LAWYER_IDS=3ee97030-bc1a-47c1-b06c-bd2b1acee637`.
- Produces: a production mobile directory response containing that ID without exposing the review marker.

- [ ] **Step 1: Run the full verification suite**

Run `pnpm test`, `pnpm exec tsc --noEmit`, and `pnpm run build:next-only` from
`apps/lawyers.bh` using Node 22.

Expected: all tests PASS, TypeScript exits 0, and the Next production build
finishes successfully.

- [ ] **Step 2: Configure the production allowlist**

Set the production-only Vercel environment variable to the exact Habib lawyer
UUID. Do not configure Preview or Development unless separately requested.

- [ ] **Step 3: Deploy the tested revision to production**

Deploy the `PRODUCTION` target using the project's established Vercel workflow
and record the deployment ID.

- [ ] **Step 4: Verify production boundaries**

Call the live mobile directory and confirm the Habib ID is present while
`isReviewAccount` is absent. Confirm both `/ar/directory` and `/en/directory`
still omit the ID, license, and email. Run only safe read-only SOS checks and
confirm the account receives no real pickup.

- [ ] **Step 5: Record rollback instructions**

To hide the account before publishing: remove
`MOBILE_DIRECTORY_REVIEW_LAWYER_IDS` from Production and redeploy. The safe
default immediately returns to excluding every review account.
