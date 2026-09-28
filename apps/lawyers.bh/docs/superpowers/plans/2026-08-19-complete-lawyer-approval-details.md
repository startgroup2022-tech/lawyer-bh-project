# Complete Lawyer Approval Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show every administrator-relevant lawyer profile field and uploaded document in the website approvals page while excluding credentials, internal storage metadata, tracking data, invite secrets, live location, and Tap internal identifiers.

**Architecture:** Extend the server-side approval projection with the missing safe profile fields, serialize date and JSON values into a client-safe `ApplicationItem`, and render the information in labeled sections within each existing approval card. Reuse the permission-protected provider file route for documents so raw Blob paths, Base64 payloads, and private URLs never enter the client response.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, Vitest, Tailwind CSS.

## Global Constraints

- Website only: `/Users/hma/lawyers.bh/apps/lawyers.bh`.
- Keep `manage_approvals` authorization on the page and document route.
- Display submitted profile and approval data, including CR, IBAN, IBAN certificate, and all safe business/profile fields present in `bahrain_lawyers`.
- Exclude `passwordHash`, Base64 payloads, Blob paths and raw storage URLs, IP address, user agent, invite token and expiry, consent internals, precise base/live location, signature data payloads, and Tap lead/retailer/destination/error internals.
- Do not change the database schema or write production data.
- Preserve Arabic and English rendering.

---

### Task 1: Define and Test the Safe Approval Projection

**Files:**
- Create: `app/[locale]/admin/approvals/presentation.ts`
- Create: `app/[locale]/admin/approvals/presentation.test.ts`
- Modify: `app/[locale]/admin/approvals/page.tsx`
- Modify: `app/[locale]/admin/approvals/Content.tsx`

**Interfaces:**
- Produces: `buildApplicationItem(row, reviewedByName, locale): ApplicationItem`.
- Produces: client-safe fields `countryCode`, `workingHours`, `membershipNo`, `profileCompleted`, `completedProfileAt`, `invitedAt`, `isEmergencyReady`, `emergencyRadiusKm`, `emergencyRates`, `locationSharingEnabled`, `personalIdFileName`, and `signatureImageAvailable`.
- Consumes: existing `ApplicationItem` status, specialty, banking, file-name, review, and Tap stage fields.

- [ ] **Step 1: Write a failing safe-projection test**

Create a fixture containing all safe fields plus sentinel values for `passwordHash`, `ipAddress`, `userAgent`, `inviteToken`, `profileImageBase64`, `licenseFileBase64`, `signatureDataUrl`, storage URLs/paths, precise locations, and Tap internal IDs. Assert that `buildApplicationItem` retains the safe profile fields and that serialized output does not contain any sentinel secret or internal-storage value.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest run 'app/[locale]/admin/approvals/presentation.test.ts'`

Expected: FAIL because `presentation.ts` and `buildApplicationItem` do not exist.

- [ ] **Step 3: Implement the minimal typed projection**

Move the existing date and specialty normalization into `presentation.ts`, define a server-row input type containing only selected columns, and return the expanded `ApplicationItem`. Represent emergency rates as a JSON-safe keyed object and expose document availability only through file names or booleans. Keep Tap output limited to the stage, KYC status, payout flag, and last-attempt timestamp already useful to approval staff.

- [ ] **Step 4: Extend the Drizzle selection with safe fields only**

Add the safe columns named in the interface to the explicit `.select({...})` in `page.tsx`. Do not select credentials, storage payloads/paths, tracking fields, invitation secrets, raw signatures, precise coordinates, or Tap internal identifiers/errors. Replace the inline map with `buildApplicationItem`.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `pnpm exec vitest run 'app/[locale]/admin/approvals/presentation.test.ts'`

Expected: PASS with no secret sentinel present in serialized results.

---

### Task 2: Render All Safe Lawyer Information and Documents

**Files:**
- Modify: `app/[locale]/admin/approvals/Content.tsx`
- Modify: `app/api/admin/provider-applications/[id]/file/[kind]/route.ts`
- Modify: `app/api/admin/provider-applications/[id]/file/[kind]/route.test.ts`
- Test: `app/[locale]/admin/approvals/presentation.test.ts`

**Interfaces:**
- Consumes: the expanded `ApplicationItem` from Task 1.
- Produces: grouped sections for identity/contact, professional data, banking and documents, service/emergency settings, and administrative history.
- Extends file kinds with `personal-id` and `signature` while preserving `profile | license | iban | institution`.

- [ ] **Step 1: Add failing document-route tests**

Add tests proving an authorized administrator can open the personal-ID document and signature image through the existing protected route, and receives 404 when an optional document is absent. Assert that no storage path is returned in a response body.

- [ ] **Step 2: Run document tests and verify RED**

Run: `pnpm exec vitest run 'app/api/admin/provider-applications/[id]/file/[kind]/route.test.ts'`

Expected: FAIL because `personal-id` and `signature` are not accepted file kinds.

- [ ] **Step 3: Extend the protected file route**

Add typed field mappings for personal ID and signature image using the existing redirect-or-buffer behavior. Keep `requireAdminPermission("manage_approvals")`, MIME handling, and 404 behavior unchanged.

- [ ] **Step 4: Render grouped approval details**

Break the existing flat information grid into compact labeled sections. Show localized labels and `غير مقدم` / `Not provided` for empty optional values. Include every `ApplicationItem` field, format timestamps with `ar-BH` or `en-US`, render emergency-rate keys and values, and show document links only when their availability field is true. Keep approval, rejection, suspension, and repair actions unchanged.

- [ ] **Step 5: Verify focused behavior**

Run: `pnpm exec vitest run 'app/[locale]/admin/approvals/presentation.test.ts' 'app/api/admin/provider-applications/[id]/file/[kind]/route.test.ts'`

Expected: all focused tests PASS.

- [ ] **Step 6: Verify types, lint, and build**

Run: `pnpm exec tsc --noEmit --incremental false`

Run: `pnpm exec eslint 'app/[locale]/admin/approvals/page.tsx' 'app/[locale]/admin/approvals/Content.tsx' 'app/[locale]/admin/approvals/presentation.ts' 'app/[locale]/admin/approvals/presentation.test.ts' 'app/api/admin/provider-applications/[id]/file/[kind]/route.ts' 'app/api/admin/provider-applications/[id]/file/[kind]/route.test.ts'`

Run: `pnpm build:next-only`

Expected: all commands exit 0. If the full build reports an unrelated existing failure, record the exact failure separately and do not describe the build as passing.

- [ ] **Step 7: Review scope without committing**

Run: `git diff --check`

Run: `git status --short`

Confirm only the approvals projection/UI, protected document route/tests, and this plan changed. Do not commit, push, deploy, or alter production data without a separate user request.
