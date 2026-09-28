# Role Login and Expired-License Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix LegalSOS role-first sign-in and contact copy, make expired-license accounts consistently suspended, and let super administrators provision a country's isolated database tables without publishing that country.

**Architecture:** Keep the three existing authentication systems separate and route each role to its established login. Canonicalize automatic license expiry as a suspended status, repair legacy production rows with a journaled migration, and retain a read-side safeguard in approvals presentation.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, PostgreSQL/Drizzle migrations, pnpm 10.

## Global Constraints

- Do not merge client, provider, or administrator authentication backends.
- Do not attempt a real login, registration, or account mutation during live verification.
- Preserve unrelated dirty LegalSOS website files in the main worktree.
- Release DEV before merging DEV into PRODUCTION.

---

### Task 1: Canonical expired-license suspension

**Files:**
- Modify: `apps/lawyers.bh/lib/provider/license-expiry-store.ts`
- Create: `apps/lawyers.bh/lib/provider/license-expiry-store.test.ts`
- Modify: `apps/lawyers.bh/app/[locale]/admin/approvals/presentation.ts`
- Modify: `apps/lawyers.bh/app/[locale]/admin/approvals/presentation.test.ts`

**Interfaces:**
- Consumes: `postgresLicenseExpiryStore.deactivateExpired(runDate)` and `buildApplicationItem(row, reviewedByName, locale)`.
- Produces: expired accounts with `status='suspended'`, plus `ApplicationItem.status='suspended'` whenever `suspensionType` is present.

- [ ] **Step 1: Write failing contract and presentation tests**

Assert the store SQL includes `status = 'suspended'` and that `buildApplicationItem` maps an approved legacy row with `suspensionType: 'license_expired'` to suspended.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `pnpm --filter lawyers.bh test -- lib/provider/license-expiry-store.test.ts 'app/[locale]/admin/approvals/presentation.test.ts'`

Expected: failures because the write and read-side normalization are absent.

- [ ] **Step 3: Implement the minimal canonical state changes**

Add `status = 'suspended'` to the expiry update and derive presentation status as `row.suspensionType ? 'suspended' : row.status`.

- [ ] **Step 4: Run the focused tests and verify success**

Run the command from Step 2. Expected: all focused tests pass.

- [ ] **Step 5: Commit the behavior change**

Commit message: `fix: show expired licenses as suspended`.

### Task 2: Repair legacy expired-license rows

**Files:**
- Create: `apps/lawyers.bh/drizzle/0111_repair_expired_license_status.sql`
- Create: `apps/lawyers.bh/drizzle/verify_0111_repair_expired_license_status.sql`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Create: `apps/lawyers.bh/lib/provider/expired-license-status-migration.test.ts`

**Interfaces:**
- Consumes: `bahrain_lawyers.status` and `bahrain_lawyers.suspension_type`.
- Produces: existing `license_expired` rows use `status='suspended'` without changing other suspension types.

- [ ] **Step 1: Write the failing migration contract test**

Read the migration and assert its update targets only `suspension_type = 'license_expired'` with non-suspended status and sets status to suspended.

- [ ] **Step 2: Run the contract test and verify failure**

Run: `pnpm --filter lawyers.bh test -- lib/provider/expired-license-status-migration.test.ts`

Expected: failure because migration 0111 does not exist.

- [ ] **Step 3: Add the migration, verifier, and journal entry**

The migration performs one guarded update. The verifier raises an exception if any expired-license row remains non-suspended.

- [ ] **Step 4: Run the contract test and a rolled-back database verification**

Run the focused test, then execute migration and verifier in a transaction ending with `ROLLBACK` against the configured test/production-equivalent database connection.

- [ ] **Step 5: Commit the migration**

Commit message: `fix: repair expired license account statuses`.

### Task 3: LegalSOS role-first sign-in

**Files:**
- Modify: `apps/legal-sos-website/components/PortalShell.tsx`
- Modify: `apps/legal-sos-website/lib/translations/ar.ts`
- Modify: `apps/legal-sos-website/lib/translations/en.ts`
- Create: `apps/legal-sos-website/test/portal-role-login.test.tsx`

**Interfaces:**
- Consumes: locale, existing `openAuthMode('signin')`, and existing client login form.
- Produces: role chooser state and localized external provider/admin login destinations.

- [ ] **Step 1: Write a failing role chooser test**

Render the portal, activate sign-in, and assert Client, Lawyer, and Administration choices appear without `.field-error`; assert localized provider and admin links.

- [ ] **Step 2: Run the role chooser test and verify failure**

Run: `pnpm --filter legal-sos-website test -- test/portal-role-login.test.tsx`

Expected: failure because sign-in opens the client form directly.

- [ ] **Step 3: Implement the role chooser and translations**

Add an `AuthPanelMode` role-choice state. Client proceeds to the existing sign-in form; lawyer and administration use `https://www.lawyers.bh/{locale}/login/provider` and `/login/admin`. Clear `authError` whenever the chooser opens or a role is selected.

- [ ] **Step 4: Run the role test and full LegalSOS website test suite**

Run the focused command, then `pnpm --filter legal-sos-website test`.

- [ ] **Step 5: Commit the LegalSOS change**

Commit message: `fix: choose account role before LegalSOS login`.

### Task 4: Country database provisioning

**Files:**
- Modify: `apps/lawyers.bh/lib/countries/store.ts`
- Create: `apps/lawyers.bh/lib/countries/provisioning.ts`
- Create: `apps/lawyers.bh/lib/countries/provisioning.test.ts`
- Create: `apps/lawyers.bh/app/api/admin/country-settings/provision/route.ts`
- Create: `apps/lawyers.bh/app/api/admin/country-settings/provision/route.test.ts`
- Modify: `apps/lawyers.bh/app/[locale]/admin/countries/Content.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/admin/countries/Content.test.tsx`

**Interfaces:**
- Consumes: ISO country catalogue, `countries_before_write` trigger, and super-admin authorization.
- Produces: `provisionCountryDatabase(input)` and a same-origin `POST /api/admin/country-settings/provision` endpoint.

- [ ] **Step 1: Write failing validation, endpoint, and presentation tests**

Cover normalized calling code/currency/locale, rejected unknown countries, super-admin and same-origin checks, delegation to the store, and visible provision action without changing channel switches.

- [ ] **Step 2: Run focused tests and verify failure**

Run the new country provisioning tests and existing country page tests. Expected: failures because the service, endpoint, and button do not exist.

- [ ] **Step 3: Implement transactional provisioning and UI**

Insert or update the country with `isActive: true`; reuse an existing prefix or use lower-case ISO for a new country. Let the existing database trigger create tables atomically. Add a confirmation form and refresh country state after success. Do not update app/website channel settings.

- [ ] **Step 4: Run focused tests and verify success**

Run the tests from Step 2. Expected: all pass.

- [ ] **Step 5: Commit the country provisioning change**

Commit message: `feat: provision country databases from admin`.

### Task 5: Correct LegalSOS public contact address

**Files:**
- Modify: `apps/legal-sos-website/components/LandingSections.tsx`
- Modify: `apps/legal-sos-website/lib/terms-content.ts`
- Modify: `apps/legal-sos-website/test/terms-page.test.ts`
- Create: `apps/legal-sos-website/test/footer-contact.test.tsx`

**Interfaces:**
- Consumes: existing footer and policy content.
- Produces: public `info@legalsos.org` contact copy with no `info@legalsos.com` runtime occurrence.

- [ ] **Step 1: Write failing footer and policy tests**

Require `.org` and reject `.com` across rendered footer and all policy locales.

- [ ] **Step 2: Run tests and verify failure**

Run the footer and terms tests. Expected: failure on the old `.com` address.

- [ ] **Step 3: Replace only the LegalSOS public contact address**

Update footer and Arabic, English, and Turkish policy content. Do not change operational administration emails.

- [ ] **Step 4: Run tests and verify success, then commit**

Commit message: `fix: correct LegalSOS contact domain`.

### Task 6: Verify and release

**Files:**
- Verify all files changed by Tasks 1-5.

**Interfaces:**
- Consumes: tested commits and existing Vercel projects.
- Produces: pushed DEV/PRODUCTION refs and READY production deployments.

- [ ] **Step 1: Run final focused tests, TypeScript checks, and both builds**

Run Lawyers.bh focused tests and typecheck, then LegalSOS tests/typecheck/build. Record exact exit statuses.

- [ ] **Step 2: Push DEV and verify the remote ref**

Fast-forward DEV from the isolated worktree, push it, fetch, and compare local and remote commit IDs.

- [ ] **Step 3: Merge DEV into PRODUCTION and push**

Create a normal merge commit as `omaralnadeem-max <omaralnadeem@gmail.com>`, push, fetch, and compare refs.

- [ ] **Step 4: Deploy Lawyers.bh and LegalSOS**

Deploy Lawyers.bh from the monorepo root with its project root setting, then deploy `apps/legal-sos-website` to the LegalSOS project. Wait for both deployments to report READY.

- [ ] **Step 5: Perform safe live verification**

Verify localized provider/admin login URLs return a successful page, LegalSOS portal returns 200, and its initial rendered entry contains the role chooser labels without submitting credentials. Check recent deployment logs for new 500 responses.

- [ ] **Step 6: Preserve main-worktree changes and remove the isolated worktree**

Confirm the pre-existing dirty files remain unchanged, delete only generated deployment metadata in the temporary worktree, and remove that worktree.
