# LegalSOS Multi-Country Lawyer Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep lawyer registration inside LegalSOS while routing Bahrain and Saudi applications to their country tables, reviewing both in the existing lawyers.bh administration, and keeping the public lawyers.bh platform Bahrain-only.

**Architecture:** LegalSOS owns the public form and a same-origin proxy; lawyers.bh owns a dedicated LegalSOS registration API backed by a shared country-aware registration service. Country table selection is derived only from the active `countries.table_prefix` record, while admin repositories explicitly receive `{ providerId, countryCode }` and public lawyers.bh reads remain hard-scoped to `BH`.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Testing Library, Drizzle/PostgreSQL, Vercel Blob, pnpm with Node 22.

## Global Constraints

- Preserve all unrelated dirty-worktree changes and stage only files named by the active task.
- Use Node `/Users/hma/.nvm/versions/node/v22.22.2/bin` for pnpm and Vercel commands.
- lawyers.bh remains Bahrain-only on every public surface.
- LegalSOS is multi-country; the first enabled registration countries are exactly `BH` and `SA`.
- `BH` writes only to `bahrain_lawyers`; `SA` writes only to `saudi_lawyers`.
- Bahrain and Saudi Arabia use the same registration fields in phase one.
- The browser never supplies a table name and cannot override the submitted country after server validation.
- Existing lawyers.bh administrator accounts manage both countries.
- Standalone user-facing `محام` and `محامٍ` become `محامي`; do not change `المحامي`, `المحامين`, or `المحاماة`.
- Do not create real accounts, send real registration notifications, or publish without explicit approval at the applicable checkpoint.
- Database tests, local tests, Git state, deployment state, live endpoint probes, and controlled real registration evidence are reported separately.

---

### Task 1: Restore and Gate Production Database Availability

**Files:**
- Create: `apps/lawyers.bh/scripts/verify-legalsos-registration-readiness.mjs`
- Test: `apps/lawyers.bh/scripts/verify-legalsos-registration-readiness.test.ts`

**Interfaces:**
- Consumes: `DATABASE_URL`, the `countries` and `country_channel_settings` tables.
- Produces: a read-only command that exits `0` only when `BH` and `SA` are active, provisioned, channel-enabled, and their lawyer tables exist.

- [ ] **Step 1: Restore the Neon quota outside the repository**

Upgrade or reset the production Neon project so a read-only query no longer returns PostgreSQL error `53000`. Do not continue to production verification while the quota error remains.

- [ ] **Step 2: Write the failing readiness-script test**

Test a pure `evaluateReadiness` function with this contract:

```ts
type CountryReadiness = {
  code: "BH" | "SA";
  tablePrefix: string;
  isActive: boolean;
  tablesProvisioned: boolean;
  appEnabled: boolean;
  websiteEnabled: boolean;
  lawyerTableExists: boolean;
};

expect(evaluateReadiness(fixtures)).toEqual({
  ok: true,
  countries: ["BH", "SA"],
});
```

Add failure cases for disabled channels, missing table, inactive country, and an unexpected table prefix.

- [ ] **Step 3: Run the focused test and confirm red**

Run:

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh vitest run scripts/verify-legalsos-registration-readiness.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 4: Implement the read-only readiness command**

Query only metadata and counts. Derive expected tables with the same safe-prefix rule as `lib/db/country-tables.ts`. Print JSON without credentials:

```json
{"ok":true,"countries":["BH","SA"]}
```

On quota failure, print `{"ok":false,"code":"DATABASE_QUOTA_EXCEEDED"}` and exit non-zero.

- [ ] **Step 5: Run the test and production readiness command**

Expected: focused test PASS; production command reports both countries ready. If production still reports a quota error, stop before deployment work.

- [ ] **Step 6: Commit**

```bash
git add apps/lawyers.bh/scripts/verify-legalsos-registration-readiness.mjs apps/lawyers.bh/scripts/verify-legalsos-registration-readiness.test.ts
git commit -m "test: verify LegalSOS country readiness"
```

### Task 2: Extract a Shared Country-Aware Registration Service

**Files:**
- Create: `apps/lawyers.bh/lib/registration/legalsos-registration.ts`
- Create: `apps/lawyers.bh/lib/registration/legalsos-registration.test.ts`
- Modify: `apps/lawyers.bh/app/api/mobile/lawyers/register/route.ts`
- Modify: `apps/lawyers.bh/app/api/join/route.ts`

**Interfaces:**
- Consumes: a validated `FormData`, explicit channel, request metadata, `getActiveCountry`, private upload services, agreement service, and notification service.
- Produces:

```ts
export type RegistrationChannel = "legalsos-web" | "legalsos-mobile" | "lawyers-bh-web";
export async function submitLawyerRegistration(input: {
  formData: FormData;
  channel: RegistrationChannel;
  request: Request;
}): Promise<NextResponse>;
```

- [ ] **Step 1: Write failing table-routing tests**

Mock `getActiveCountry` and the persistence boundary. Assert:

```ts
expect(resolveRegistrationDestination({ code: "BH", tablePrefix: "bahrain" })).toBe("bahrain_lawyers");
expect(resolveRegistrationDestination({ code: "SA", tablePrefix: "saudi" })).toBe("saudi_lawyers");
expect(() => resolveRegistrationDestination({ code: "SA", tablePrefix: "bahrain" })).toThrow("country_table_mismatch");
```

Also assert that inactive/unprovisioned country lookup returns `COUNTRY_UNAVAILABLE` and that the service ignores any form field named `table`, `tableName`, or `tablePrefix`.

- [ ] **Step 2: Run the tests and confirm red**

Run the new test alone. Expected: FAIL because the shared service does not exist.

- [ ] **Step 3: Implement explicit channel handling**

Move shared parsing, country lookup, duplicate checks, file validation, agreement binding, insert, session/token issuance, and notification dispatch behind `submitLawyerRegistration`. Do not infer channel from `request.url`.

- [ ] **Step 4: Adapt existing routes**

Use explicit adapters:

```ts
return submitLawyerRegistration({
  formData: await request.formData(),
  channel: "legalsos-mobile",
  request,
});
```

The lawyers.bh join route uses `lawyers-bh-web`; the new endpoint in Task 3 uses `legalsos-web`.

- [ ] **Step 5: Verify compatibility**

Run the new test plus:

```bash
pnpm --dir apps/lawyers.bh vitest run app/api/mobile/lawyers/register/route.test.ts app/api/join/route.test.ts lib/registration/join-server-validation-contract.test.ts
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/lawyers.bh/lib/registration/legalsos-registration.ts apps/lawyers.bh/lib/registration/legalsos-registration.test.ts apps/lawyers.bh/app/api/mobile/lawyers/register/route.ts apps/lawyers.bh/app/api/join/route.ts
git commit -m "refactor: share country-aware lawyer registration"
```

### Task 3: Add the Dedicated LegalSOS Registration Contract

**Files:**
- Create: `apps/lawyers.bh/app/api/legalsos/lawyers/register/route.ts`
- Create: `apps/lawyers.bh/app/api/legalsos/lawyers/register/route.test.ts`
- Modify: `apps/legal-sos-website/app/api/lawyer/register/route.ts`
- Create: `apps/legal-sos-website/test/lawyer-register-proxy.test.ts`

**Interfaces:**
- Consumes: multipart registration fields and `countryCode` of `BH` or `SA`.
- Produces: `{ ok, id, countryCode, status, reference }` on success and stable machine codes on failure.

- [ ] **Step 1: Write failing backend contract tests**

Assert that the endpoint calls `submitLawyerRegistration` with `channel: "legalsos-web"`, rejects non-multipart bodies, preserves `SA`, and never maps it to `BH`.

- [ ] **Step 2: Write failing proxy tests**

Assert the LegalSOS proxy calls exactly `/api/legalsos/lawyers/register`, preserves multipart boundaries by passing `FormData`, forwards no client-supplied authorization, and relays JSON/status without exposing backend stack traces.

- [ ] **Step 3: Run both tests and confirm red**

Expected: backend test fails because the route is absent; website test fails because the old compatibility URL is still used.

- [ ] **Step 4: Implement the backend route and website proxy**

The backend adapter must be only:

```ts
export async function POST(request: Request) {
  return submitLawyerRegistration({
    formData: await request.formData(),
    channel: "legalsos-web",
    request,
  });
}
```

Keep the proxy HTTPS/localhost origin allowlist and return `Cache-Control: no-store`.

- [ ] **Step 5: Run focused tests, typecheck, and commit**

Expected: focused tests and both app typechecks PASS.

```bash
git add apps/lawyers.bh/app/api/legalsos/lawyers/register apps/legal-sos-website/app/api/lawyer/register/route.ts apps/legal-sos-website/test/lawyer-register-proxy.test.ts
git commit -m "feat: add LegalSOS lawyer registration endpoint"
```

### Task 4: Make Agreements Country-Specific

**Files:**
- Create: `apps/lawyers.bh/drizzle/0109_country_scoped_legalsos_lawyer_terms.sql`
- Create: `apps/lawyers.bh/drizzle/verify_0109_country_scoped_legalsos_lawyer_terms.sql`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Modify: `apps/lawyers.bh/lib/db/schema.ts`
- Modify: `apps/lawyers.bh/lib/terms-management/types.ts`
- Modify: `apps/lawyers.bh/lib/terms-management/service.ts`
- Modify: `apps/lawyers.bh/app/api/mobile/legal-documents/[document]/route.ts`
- Modify: `apps/legal-sos-website/app/api/lawyer/agreement/route.ts`
- Test: `apps/lawyers.bh/lib/terms-management/database.integration.test.ts`
- Test: `apps/lawyers.bh/app/api/mobile/legal-documents/[document]/route.test.ts`

**Interfaces:**
- Produces: `getPublishedTerms(documentType, { countryCode?: string })` and `GET .../lawyer-agreement?locale=ar&countryCode=SA`.

- [ ] **Step 1: Write failing service and route tests**

Create published BH and SA agreement fixtures and assert independent retrieval. Assert missing `countryCode` defaults to `BH` only for legacy mobile clients.

- [ ] **Step 2: Write the migration**

Add nullable `country_code`, backfill existing LegalSOS lawyer agreement rows to `BH`, then make the column required for `legalsos_lawyer_agreement`. Replace publication/version unique indexes so their scope includes country for that document type while preserving global scope for other policies.

- [ ] **Step 3: Update schema and service signatures**

Return the country in `TermsVersion`; validate it as two uppercase letters. Do not silently fall back from `SA` to a Bahrain agreement.

- [ ] **Step 4: Update both agreement proxies**

LegalSOS sends the selected country; the backend returns `agreement_unavailable` when that country's agreement is unpublished.

- [ ] **Step 5: Verify migration and focused tests**

Run migration contract tests serially, database integration using `CLIENT_AUTH_TEST_DATABASE_URL`, and route tests. A skipped database suite is not a passing database verification.

- [ ] **Step 6: Commit**

```bash
git add apps/lawyers.bh/drizzle/0109_country_scoped_legalsos_lawyer_terms.sql apps/lawyers.bh/drizzle/verify_0109_country_scoped_legalsos_lawyer_terms.sql apps/lawyers.bh/drizzle/meta/_journal.json apps/lawyers.bh/lib/db/schema.ts apps/lawyers.bh/lib/terms-management apps/lawyers.bh/app/api/mobile/legal-documents apps/legal-sos-website/app/api/lawyer/agreement/route.ts
git commit -m "feat: scope LegalSOS lawyer agreements by country"
```

### Task 5: Align the LegalSOS Registration Form with the Shared Contract

**Files:**
- Modify: `apps/legal-sos-website/components/LawyerRegistrationFlow.tsx`
- Modify: `apps/legal-sos-website/components/LawyerRegistrationFlow.module.css`
- Create: `apps/legal-sos-website/lib/lawyer-registration.ts`
- Create: `apps/legal-sos-website/test/lawyer-registration.test.tsx`
- Modify: `apps/legal-sos-website/components/PortalShell.tsx`

**Interfaces:**
- Consumes: selected `countryCode`, agreement response, and stable backend errors.
- Produces: locked country-aware form submission and localized pending-review success state.

- [ ] **Step 1: Write failing component tests**

Cover BH and SA separately. Assert country label/flag, country-specific phone prefix, IBAN prefix validation, required identical fields, agreement request containing country, double-submit lock, preserved values after recoverable failure, and reference/country in success copy.

- [ ] **Step 2: Write failing error-mapping tests**

Define and test:

```ts
export type LawyerRegistrationErrorCode =
  | "COUNTRY_UNAVAILABLE"
  | "DUPLICATE_EMAIL"
  | "DUPLICATE_LICENSE"
  | "INVALID_PHONE"
  | "INVALID_IBAN"
  | "INVALID_DOCUMENT"
  | "AGREEMENT_UNAVAILABLE"
  | "AGREEMENT_STALE"
  | "SERVICE_UNAVAILABLE";
```

Each code must have Arabic, English, and Turkish copy.

- [ ] **Step 3: Implement country-aware form behavior**

Use `countryCode` from `SiteProvider`, reset only country-dependent phone/IBAN values when the user deliberately changes country before entering registration, and freeze the form's country once submission starts.

- [ ] **Step 4: Remove Bahrain defaults from client auth phone fields**

Initialize the client phone field from `site.country.dialCode`, not `+973`.

- [ ] **Step 5: Verify component tests, all website tests, typecheck, and lint**

Expected: no failing tests and no new warnings.

- [ ] **Step 6: Commit**

```bash
git add apps/legal-sos-website/components/LawyerRegistrationFlow.tsx apps/legal-sos-website/components/LawyerRegistrationFlow.module.css apps/legal-sos-website/components/PortalShell.tsx apps/legal-sos-website/lib/lawyer-registration.ts apps/legal-sos-website/test/lawyer-registration.test.tsx
git commit -m "feat: add country-aware LegalSOS registration form"
```

### Task 6: Make Administrator Review Country-Aware

**Files:**
- Create: `apps/lawyers.bh/lib/admin/provider-applications-repository.ts`
- Create: `apps/lawyers.bh/lib/admin/provider-applications-repository.test.ts`
- Modify: `apps/lawyers.bh/app/[locale]/admin/approvals/page.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/admin/approvals/Content.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/admin/approvals/presentation.ts`
- Modify: `apps/lawyers.bh/app/[locale]/admin/approvals/presentation.test.ts`
- Modify: `apps/lawyers.bh/app/api/admin/provider-applications/[id]/approve/route.ts`
- Modify: `apps/lawyers.bh/app/api/admin/provider-applications/[id]/reject/route.ts`
- Modify: `apps/lawyers.bh/app/api/admin/provider-applications/[id]/suspend/route.ts`
- Modify: `apps/lawyers.bh/app/api/admin/provider-applications/[id]/reactivate/route.ts`
- Modify: `apps/lawyers.bh/app/api/admin/provider-applications/[id]/file/[kind]/route.ts`
- Modify: `apps/lawyers.bh/lib/registration/lawyer-registration-emails.ts`

**Interfaces:**
- Produces repository methods requiring `{ id, countryCode }`, plus UI filters `ALL | BH | SA`.

- [ ] **Step 1: Write failing repository tests**

Assert list unions only active configured country lawyer tables and normalizes a common application shape. Every read/update/file lookup requires both ID and country.

- [ ] **Step 2: Implement the country-aware repository**

Resolve table through `getActiveCountry` and `buildCountryTableSet`. Never concatenate a request-provided table string.

- [ ] **Step 3: Write failing admin UI tests**

Assert combined list, country badge, country filters, preserved status filter, and country included in action requests.

- [ ] **Step 4: Update action and document routes**

Require `countryCode` in a validated query/body field. An ID found in another country must return 404, not cross-scope.

- [ ] **Step 5: Update notifications**

Email subject/body and platform notification include `BH — البحرين` or `SA — السعودية` and application reference.

- [ ] **Step 6: Run admin route, repository, UI, and email tests**

Expected: all focused tests PASS, including authorization tests for private document routes.

- [ ] **Step 7: Commit**

```bash
git add apps/lawyers.bh/lib/admin/provider-applications-repository.ts apps/lawyers.bh/lib/admin/provider-applications-repository.test.ts apps/lawyers.bh/app/'[locale]'/admin/approvals apps/lawyers.bh/app/api/admin/provider-applications apps/lawyers.bh/lib/registration/lawyer-registration-emails.ts
git commit -m "feat: review provider applications by country"
```

### Task 7: Prove Public lawyers.bh Is Bahrain-Only

**Files:**
- Create: `apps/lawyers.bh/lib/lawyers/bahrain-public-isolation-contract.test.ts`
- Modify only if a test proves it necessary: public directory, profile, search, sitemap, SEO, booking candidate, and public provider query modules identified by the test.

**Interfaces:**
- Produces: a repository-level public provider API that has no public country parameter and always applies `countryCode = "BH"`.

- [ ] **Step 1: Inventory all public provider reads in a contract test**

The test scans server source and fails when public code queries a country table without the Bahrain scope helper.

- [ ] **Step 2: Add behavioral tests with BH and SA fixtures**

Directory list, provider detail, search, sitemap, SEO and booking candidates must return BH and exclude SA.

- [ ] **Step 3: Implement the smallest required query fixes**

Centralize the scope:

```ts
export const PUBLIC_LAWYERS_BH_COUNTRY = "BH" as const;
```

Do not add a public query parameter that can switch the country.

- [ ] **Step 4: Run public-isolation and existing directory tests**

Expected: all PASS with explicit SA exclusion assertions.

- [ ] **Step 5: Commit**

Stage only the new contract test and public query files actually required by the failures.

### Task 8: Standardize Arabic Terminology and Repair Website Quality Gates

**Files:**
- Modify: `apps/legal-sos-website/lib/translations/ar.ts`
- Modify: `apps/legal-sos-website/lib/terms-content.ts`
- Modify: `apps/legal-sos-website/components/SosDialog.tsx`
- Modify: `apps/legal-sos-website/components/SosContinuation.tsx`
- Modify: `apps/legal-sos-website/components/LawyerRegistrationFlow.tsx`
- Modify: user-facing `.dart` files identified by the scan under the separate repository `/Users/hma/legalsos_app/lib`
- Modify: relevant user-facing backend notification/admin copy under `apps/lawyers.bh/app` and `apps/lawyers.bh/lib`
- Create: `apps/legal-sos-website/test/arabic-terminology.test.ts`
- Modify: `apps/legal-sos-website/test/sos-schema.test.ts`
- Modify: `apps/legal-sos-website/test/terms-links.test.tsx`

**Interfaces:**
- Produces: consistent `محامي` copy and green website tests/lint.

- [ ] **Step 1: Write the failing terminology test**

Scan user-facing `.ts`, `.tsx`, and `.dart` sources with the Unicode-aware pattern:

```ts
/(?<![\p{L}\p{N}_])محام(?:ٍ)?(?![\p{L}\p{N}_])/gu
```

Exclude test fixtures that intentionally verify the banned form, generated files, migrations, and historical docs.

- [ ] **Step 2: Replace only standalone user-facing forms**

Preserve `المحامي`, `المحامين`, `محامون`, and `المحاماة`. Update affected expectations in the same commit.

- [ ] **Step 3: Repair the two currently failing website tests**

Update the SOS schema fixture with a UUID category, `phoneDialCode`, and UUID `idempotencyKey`. Query the rendered case as a button with `aria-pressed`, not a nonexistent `option` role.

- [ ] **Step 4: Resolve the seven existing lint warnings**

Replace unused short-circuit expressions with explicit `if` blocks. Stabilize `refresh`, `dispatch`, and `loadMessages` with `useCallback`; then give each effect complete dependencies without introducing polling loops.

- [ ] **Step 5: Run website tests, typecheck and lint; run focused Flutter tests**

Expected: 0 failing website tests, typecheck PASS, lint with 0 warnings in modified files, and affected Flutter widget tests PASS.

- [ ] **Step 6: Commit separately in each repository**

Commit lawyers.bh/LegalSOS website changes without staging existing unrelated dirty files. Commit Flutter changes in `/Users/hma/legalsos_app` without staging unrelated app work.

### Task 9: End-to-End Verification and Controlled Release

**Files:**
- Create: `apps/legal-sos-website/docs/release/2026-09-24-multi-country-registration-verification.md`
- Modify: no application files unless a failing verification returns to its owning task.

**Interfaces:**
- Produces an evidence report separating local, database, Git, deployment, live, and controlled-registration results.

- [ ] **Step 1: Run complete local verification**

Run focused backend suites serially where they share database state, full LegalSOS website tests/typecheck/lint/build, backend typecheck/build without migration side effects first, and focused Flutter tests/analyze.

- [ ] **Step 2: Apply migration to the approved test database**

Run `0109` and its verifier. Confirm independent published BH/SA agreement rows and both lawyer tables. Do not apply production migrations until explicitly approved.

- [ ] **Step 3: Verify preview deployment**

Probe country catalogue, BH/SA agreements, registration validation errors, admin list/filter, and Bahrain public isolation. Do not submit a valid application in preview unless test email/storage/notifications are isolated.

- [ ] **Step 4: Request production release approval**

Present Git refs, migration evidence, preview URLs, green checks, known limitations, and the required Neon quota status. Wait for explicit approval.

- [ ] **Step 5: Release in dependency order**

Apply the approved database migration, deploy lawyers.bh backend/admin, verify it, then deploy LegalSOS website and verify it. A Vercel `READY` state alone is not completion.

- [ ] **Step 6: Request approval for controlled real registrations**

Create no account until the user explicitly approves the exact BH and SA test identities. Use unique test data, do not opt into marketing, and clean up only with explicit authorization.

- [ ] **Step 7: Record final evidence**

Document where BH and SA records landed, admin visibility, public Bahrain isolation, notifications, agreement versions, and all remaining unverified behavior.

- [ ] **Step 8: Commit the evidence document**

```bash
git add apps/legal-sos-website/docs/release/2026-09-24-multi-country-registration-verification.md
git commit -m "docs: verify LegalSOS multi-country registration"
```
