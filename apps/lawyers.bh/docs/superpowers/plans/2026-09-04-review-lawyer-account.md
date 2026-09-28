# Review Lawyer Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create one flagged review lawyer for mobile-app testing from the verified zero-record production state while proving it remains invisible and unable to interact with real lawyer work.

**Architecture:** In one serializable transaction, require zero normalized-email, registration-number, phone, membership-number, and review-account matches before inserting an approved active record with `is_review_account = true`. Abort on any conflict, then verify authentication and every server-side isolation boundary without weakening any filter.

**Tech Stack:** Node.js 22, TypeScript, Vitest, PostgreSQL, bcryptjs, Next.js route handlers.

## Global Constraints

- Create `habib20298@gmail.com` only while the normalized-email, registration-number, phone, membership-number, and review-account counts are all zero.
- Abort before insertion if any count is nonzero.
- Require registration number, phone, membership number, and Arabic/English names as explicit inputs; do not embed them in source.
- Never store or print the password in Git, source code, migrations, command history, or application logs.
- Do not alter approval, subscription, membership, availability, or identity fields.
- Abort unless exactly one row is inserted.
- Preserve all unrelated working-tree changes.

---

### Task 1: Verify the review-account guardrails

**Files:**
- Verify: `drizzle/0053_review_lawyer_accounts.sql`
- Verify: `lib/lawyers/review-account-policy.ts`
- Test: `lib/lawyers/review-account-policy.test.ts`
- Verify: `scripts/set-review-lawyer-password.mjs`
- Test: `scripts/set-review-lawyer-password.test.ts`
- Create: `scripts/create-review-lawyer.mjs`
- Test: `scripts/create-review-lawyer.test.ts`
- Test: `lib/lawyers/review-account-isolation-contract.test.ts`
- Test: `app/api/mobile/lawyers/route.test.ts`
- Test: `lib/sos/live-dispatch.test.ts`
- Test: `lib/admin/mobile-notifications/store.test.ts`
- Test: `app/api/sos/lawyer/pickups/check/route.test.ts`
- Test: `app/api/sos/lawyer/case/[caseRef]/accept/route.test.ts`
- Test: `lib/sos/lawyer-request-eligibility.test.ts`

**Interfaces:**
- Consumes: `bahrain_lawyers.is_review_account` and the existing directory, dispatch, notification, polling, and acceptance filters.
- Produces: evidence that creation is restricted to a zero-record state, password mutation remains restricted to exactly one flagged review lawyer, and review records are excluded from lawyer-facing results.

- [ ] **Step 1: Run the focused policy and password-operation tests**

Run:

```bash
pnpm exec vitest run lib/lawyers/review-account-policy.test.ts scripts/set-review-lawyer-password.test.ts scripts/create-review-lawyer.test.ts
```

Expected: all three test files pass, including rejection when creation guards fail or a password update does not affect exactly one row.

- [ ] **Step 2: Run all review-isolation tests**

Run:

```bash
pnpm exec vitest run lib/lawyers/review-account-policy.test.ts app/api/sos/lawyer/case/[caseRef]/accept/route.test.ts
```

Expected: review lawyers are removed from real-lawyer results and rejected before a real request is read or accepted.

- [ ] **Step 3: Inspect all current server-side exclusion boundaries**

Run:

```bash
rg -n "is_review_account" app lib
```

Expected: exclusions remain present in public/mobile directories, live dispatch, notifications, polling, and acceptance paths. Stop if any boundary from the approved design is missing.

### Task 2: Atomically create the single review account

**Files:**
- Execute: `scripts/create-review-lawyer.mjs`
- No source files modified.

**Interfaces:**
- Consumes: `REVIEW_LAWYER_EMAIL`, an ephemeral `REVIEW_LAWYER_PASSWORD`, explicit registration number, phone and Arabic/English names, plus `DATABASE_URL_UNPOOLED` or `DATABASE_URL`.
- Produces: one `bahrain_lawyers` row with `status = approved`, active/profile-complete flags, a required unique membership number, and `is_review_account = true`.

- [ ] **Step 1: Read the production record without changing it**

Count normalized-email, registration-number, phone, and membership-number matches plus all rows with `is_review_account = true`.

Expected: all counts are zero. Abort otherwise.

- [ ] **Step 2: Generate an ephemeral strong password**

Generate a random password in memory or a mode-0600 temporary file. Do not place it in a committed file, shell history, environment file, or application log.

- [ ] **Step 3: Execute the guarded password update**

Run the guarded creation script with the production database connection and ephemeral values:

```bash
REVIEW_LAWYER_EMAIL='habib20298@gmail.com' \
REVIEW_LAWYER_PASSWORD='<ephemeral-value>' \
REVIEW_LAWYER_REGISTRATION_NO='<explicit-review-login-id>' \
REVIEW_LAWYER_MEMBERSHIP_NO='<explicit-review-membership-id>' \
REVIEW_LAWYER_PHONE='<explicit-review-phone>' \
REVIEW_LAWYER_FULL_NAME_AR='<explicit-review-name-ar>' \
REVIEW_LAWYER_FULL_NAME_EN='<explicit-review-name-en>' \
node scripts/create-review-lawyer.mjs
```

Expected: `Review lawyer account created for habib20298@gmail.com`; the operation aborts if either guard count is nonzero or exactly one row is not inserted.

- [ ] **Step 4: Re-read non-secret account state**

Expected: exactly one new record is flagged as a review account, approved, active, emergency-ready, and profile-complete. Do not output the stored password hash.

### Task 3: Verify mobile access and production isolation

**Files:**
- Verify the existing lawyer mobile authentication route and directory/request endpoints.
- No source files modified unless a failing isolation test proves a defect; any defect requires a new TDD cycle before implementation.

**Interfaces:**
- Consumes: the review email and ephemeral password from Task 2.
- Produces: authenticated mobile-session evidence plus public-directory and real-request isolation evidence.

- [ ] **Step 1: Authenticate through the lawyer mobile login endpoint**

Send the credentials over HTTPS and retain only the HTTP status and non-secret account identity/role fields. Do not print the password or session token.

Expected: successful authentication as the flagged lawyer account.

- [ ] **Step 2: Verify public directory exclusion**

Query the Arabic and English public/mobile lawyer directory responses for the account ID and normalized email.

Expected: no matching public lawyer or profile is returned.

- [ ] **Step 3: Verify real-request isolation**

Using the authenticated review session, call the lawyer request polling endpoint and a safe nonexistent request acceptance target.

Expected: no real requests are disclosed, and acceptance is rejected before reading or mutating a real request.

- [ ] **Step 4: Deliver credentials and evidence**

Provide the email and temporary password directly to the user. Report login, directory, notification/dispatch policy, polling, and acceptance checks separately; do not claim any check that was not run.
