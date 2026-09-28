# Consultation Types and Prices Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual, permission-protected admin page for creating, editing, ordering, archiving, restoring, and deleting consultation types whose active rows drive booking and payment prices.

**Architecture:** Extend the existing country-aware `consultation_methods` catalogue rather than creating another store. A focused management module owns validation and transactional SQL, protected Next.js handlers expose it to a bilingual client page, and the public booking/payment paths are changed from hard-coded method unions to validated active catalogue codes.

**Tech Stack:** Next.js App Router, React 19, TypeScript, PostgreSQL, Drizzle schema/migrations, Vitest, Tailwind CSS, Lucide icons.

## Global Constraints

- Active additions appear in booking immediately after a successful save.
- Codes are normalized lowercase identifiers and become immutable after creation.
- Prices are positive fixed-precision BHD values; durations are positive whole minutes.
- Archived rows do not appear publicly and cannot create a new payment.
- Permanent deletion is available only for archived rows and requires two UI confirmations.
- Historical booking rows retain their stored consultation-method text.
- Admin cards are borderless at rest and show a white border on hover.
- Every page and API operation requires `manage_consultation_types`; super administrators keep their existing bypass.
- Preserve unrelated working-tree changes by implementing only in the isolated worktree.

---

### Task 1: Add catalogue audit fields and the admin permission

**Files:**
- Create: `apps/lawyers.bh/drizzle/0074_consultation_types_admin.sql`
- Create: `apps/lawyers.bh/drizzle/verify_0074_consultation_types_admin.sql`
- Create: `apps/lawyers.bh/lib/consultation-management/migration.test.ts`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Modify: `apps/lawyers.bh/lib/db/schema.ts`
- Modify: `apps/lawyers.bh/lib/auth/admin-permissions.ts`
- Modify: `apps/lawyers.bh/lib/auth/admin-permissions.test.ts`

**Interfaces:**
- Produces permission key `manage_consultation_types`.
- Produces catalogue fields `createdByAdminId`, `updatedByAdminId`, `archivedAt`, and `archivedByAdminId`.

- [ ] **Step 1: Write failing permission and migration tests**

Add assertions that normalization retains `manage_consultation_types`, that a regular admin can be granted it, and that migration `0074` adds the four audit columns, enables the permission for current non-reviewer admins, and follows `0073` in the journal.

```ts
expect(normalizeAdminPermissions({ manage_consultation_types: true }))
  .toEqual({ manage_consultation_types: true });
expect(migration).toContain("ADD COLUMN IF NOT EXISTS archived_at");
expect(migration).toContain("'{manage_consultation_types}'");
expect(journalIndex("0074_consultation_types_admin"))
  .toBeGreaterThan(journalIndex("0073_about_page_management"));
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `pnpm exec vitest run lib/auth/admin-permissions.test.ts lib/consultation-management/migration.test.ts`

Expected: FAIL because the permission, migration, and journal entry do not exist.

- [ ] **Step 3: Add the minimal schema and migration**

Append `manage_consultation_types` to `ADMIN_PERMISSION_KEYS`. Add nullable audit columns to `consultationMethods` in Drizzle. In migration `0074`, alter `public.bahrain_consultation_methods` so inherited country tables receive the columns, and grant the new JSON permission to active `admin`/`super_admin` accounts while leaving reviewers unchanged.

```sql
ALTER TABLE public.bahrain_consultation_methods
  ADD COLUMN IF NOT EXISTS created_by_admin_id uuid,
  ADD COLUMN IF NOT EXISTS updated_by_admin_id uuid,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by_admin_id uuid;

UPDATE public.admin_users
SET permissions = jsonb_set(permissions, '{manage_consultation_types}', 'true'::jsonb, true)
WHERE role IN ('admin', 'super_admin') AND is_active = true;
```

Use the next unique journal index after the current maximum, not a copied duplicate.

- [ ] **Step 4: Add verification SQL and verify GREEN**

The verification script must raise an exception unless all four columns exist and active non-reviewer admins contain the new permission. Run the focused tests again; expected PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/lawyers.bh/drizzle apps/lawyers.bh/lib/db/schema.ts apps/lawyers.bh/lib/auth apps/lawyers.bh/lib/consultation-management/migration.test.ts
git commit -m "feat: prepare consultation catalogue administration"
```

### Task 2: Build validation and catalogue-management services

**Files:**
- Create: `apps/lawyers.bh/lib/consultation-management/types.ts`
- Create: `apps/lawyers.bh/lib/consultation-management/validation.ts`
- Create: `apps/lawyers.bh/lib/consultation-management/validation.test.ts`
- Create: `apps/lawyers.bh/lib/consultation-management/service.ts`
- Create: `apps/lawyers.bh/lib/consultation-management/service.test.ts`
- Create: `apps/lawyers.bh/lib/consultation-management/http.ts`

**Interfaces:**
- Produces `parseConsultationTypeInput(value, { includeCode }): ConsultationTypeInput`.
- Produces `listAdminConsultationTypes(country)`, `createConsultationType(country, input, actor)`, `updateConsultationType(country, id, input, actor)`, `setConsultationTypeArchived(country, id, archived, actor)`, `deleteConsultationType(country, id)`, and `reorderConsultationTypes(country, ids, actor)`.
- `ConsultationTypeInput` contains `code`, `nameAr`, `nameEn`, `price`, `currencyCode`, `durationMinutes`, and `iconKey`; update input omits `code`.

- [ ] **Step 1: Write failing validation tests**

Cover normalized codes (`" Video Call "` → `video-call`), required bilingual names, `price > 0` with at most three decimal places, three-letter uppercase currency, positive integer duration, safe icon keys, and rejection of a code on update.

```ts
expect(parseConsultationTypeInput(validCreate, { includeCode: true }).code)
  .toBe("video-call");
expect(() => parseConsultationTypeInput({ ...validCreate, price: 0 }, { includeCode: true }))
  .toThrow("invalid_price");
```

- [ ] **Step 2: Verify validation RED, implement, then verify GREEN**

Run: `pnpm exec vitest run lib/consultation-management/validation.test.ts`

Expected RED: module missing. Implement bounded string parsing and stable error codes, rerun, expected PASS.

- [ ] **Step 3: Write failing service tests**

Use the repository's SQL-client mocking pattern to prove: admin listing returns active and archived rows; create allocates the next sort order and detects duplicate codes; update never changes `code`; archive sets `is_active=false` plus audit fields; restore clears archive fields; delete rejects active rows with `archive_before_delete`; reorder rejects missing/duplicate IDs and updates all requested active rows transactionally.

```ts
await expect(deleteConsultationType(country, "active-id"))
  .rejects.toThrow("archive_before_delete");
expect(await setConsultationTypeArchived(country, "id", true, actor))
  .toMatchObject({ isActive: false });
```

- [ ] **Step 4: Verify service RED, implement, then verify GREEN**

Run: `pnpm exec vitest run lib/consultation-management/service.test.ts`

Expected RED: exported services missing. Implement parameterized values and table resolution only through `buildCountryTableSet(country)`. Map known database failures to `duplicate_code`, `not_found`, and `stale_order`; rerun, expected PASS.

- [ ] **Step 5: Add HTTP error mapping and commit**

Map validation to 400, duplicate code to 409, missing row to 404, and unexpected errors to 500 without leaking SQL. Commit only this management module.

```bash
git add apps/lawyers.bh/lib/consultation-management
git commit -m "feat: add consultation catalogue management service"
```

### Task 3: Add protected admin APIs

**Files:**
- Create: `apps/lawyers.bh/app/api/admin/consultation-types/route.ts`
- Create: `apps/lawyers.bh/app/api/admin/consultation-types/[id]/route.ts`
- Create: `apps/lawyers.bh/app/api/admin/consultation-types/reorder/route.ts`
- Create: `apps/lawyers.bh/app/api/admin/consultation-types/routes.test.ts`

**Interfaces:**
- `GET /api/admin/consultation-types?countryCode=BH` returns `{ ok, country, methods }` including archived rows.
- `POST /api/admin/consultation-types` creates an active row.
- `PATCH /api/admin/consultation-types/:id` updates fields or performs `{ action: "archive" | "restore" }`.
- `DELETE /api/admin/consultation-types/:id` permanently removes an archived row after body `{ confirmation: "DELETE" }`.
- `POST /api/admin/consultation-types/reorder` accepts `{ ids: string[], countryCode: string }`.

- [ ] **Step 1: Write failing route tests**

Assert every handler calls `requireAdminPermission("manage_consultation_types")`, returns 403 without it, resolves an active country, passes `admin.id` to writes, requires literal `DELETE`, and maps stable service errors to the designed statuses.

- [ ] **Step 2: Run route tests and verify RED**

Run: `pnpm exec vitest run app/api/admin/consultation-types/routes.test.ts`

Expected: FAIL because the handlers do not exist.

- [ ] **Step 3: Implement the handlers**

Keep handlers thin: authenticate, parse country, call the Task 2 service, and return JSON. Never accept an admin ID or SQL table name from request data.

- [ ] **Step 4: Run route tests and verify GREEN, then commit**

```bash
pnpm exec vitest run app/api/admin/consultation-types/routes.test.ts
git add apps/lawyers.bh/app/api/admin/consultation-types
git commit -m "feat: expose consultation type admin APIs"
```

### Task 4: Make booking, discounts, and payment accept dynamic active codes

**Files:**
- Modify: `apps/lawyers.bh/lib/booking/consultationMethodCatalog.ts`
- Create: `apps/lawyers.bh/lib/booking/consultationMethodCatalog.test.ts`
- Modify: `apps/lawyers.bh/lib/discounts/resolve-price.ts`
- Create: `apps/lawyers.bh/lib/discounts/resolve-price.test.ts`
- Modify: `apps/lawyers.bh/app/api/tap/charge/route.ts`
- Create: `apps/lawyers.bh/app/api/tap/charge/route.test.ts`
- Modify: `apps/lawyers.bh/app/[locale]/book-appointment/_components/book-appointment/useBookAppointmentState.tsx`

**Interfaces:**
- `PaidConsultationMethodCode` becomes a normalized non-empty `string` at the catalogue boundary.
- `findConsultationMethod(country, code)` remains the authority for whether a method is active and chargeable.
- The public API shape remains unchanged.

- [ ] **Step 1: Write failing catalogue and discount tests**

Add a valid custom row with code `home-visit` and assert it is returned, found, and priced. Add an inactive/missing custom row and assert price resolution rejects it.

```ts
expect(await findConsultationMethod(country, "home-visit"))
  .toMatchObject({ code: "home-visit", price: 50 });
await expect(resolveOriginalPrice({ consultationMethod: "archived-method" }))
  .rejects.toThrow("invalid_consultation_method");
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm exec vitest run lib/booking/consultationMethodCatalog.test.ts lib/discounts/resolve-price.test.ts`

Expected: FAIL because `VALID_CODES` and the discount allowlist reject the custom code.

- [ ] **Step 3: Remove hard-coded catalogue/discount allowlists**

Validate code syntax (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) and let the active database lookup decide validity. Preserve positive price/duration guards. Run the tests; expected PASS.

- [ ] **Step 4: Write a failing Tap charge test for a custom code**

Submit `consultationMethod: "home-visit"`, return an active catalogue row from `findConsultationMethod`, and assert the created charge uses its database price and stores `home-visit`. Also assert archived lookup failure returns 400 before calling Tap.

- [ ] **Step 5: Verify Tap RED, implement dynamic lookup, then verify GREEN**

Remove the `online/whatsapp/phone/office/video` selection fallback for appointment payments. Keep the authorization-booking exception unchanged. Treat an empty/malformed code as invalid, look up the original string, and charge only the returned active catalogue price.

Run: `pnpm exec vitest run app/api/tap/charge/route.test.ts`

Expected: PASS with custom and archived cases.

- [ ] **Step 6: Confirm booking state preserves API codes and commit**

Add or update the focused state test so selecting an API-returned `home-visit` option sends that exact code. Then commit.

```bash
git add apps/lawyers.bh/lib/booking apps/lawyers.bh/lib/discounts apps/lawyers.bh/app/api/tap/charge apps/lawyers.bh/app/[locale]/book-appointment
git commit -m "feat: support dynamic consultation methods in booking"
```

### Task 5: Build the bilingual admin page and dashboard integration

**Files:**
- Create: `apps/lawyers.bh/app/[locale]/admin/consultation-types/page.tsx`
- Create: `apps/lawyers.bh/app/[locale]/admin/consultation-types/ConsultationTypesContent.tsx`
- Create: `apps/lawyers.bh/app/[locale]/admin/consultation-types/adminPage.test.ts`
- Modify: `apps/lawyers.bh/app/[locale]/admin/page.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/admin/adminDashboardCards.test.ts`
- Modify: `apps/lawyers.bh/app/[locale]/admin/admin-users/AdminUsersContent.tsx`
- Create: `apps/lawyers.bh/app/[locale]/admin/admin-users/adminUsersContent.test.tsx`

**Interfaces:**
- Page route: `/{locale}/admin/consultation-types`.
- Client uses the Task 3 API contracts and renders active/archived sections.

- [ ] **Step 1: Write failing page/integration tests**

Assert the page protects itself with `manage_consultation_types`; the dashboard card has bilingual title, `/admin/consultation-types`, and the same permission; the permissions editor labels the permission bilingually; the card class includes `border border-transparent` and `hover:border-white`; the UI contains add/edit/archive/restore/delete actions and two permanent-delete confirmations.

- [ ] **Step 2: Run UI tests and verify RED**

Run: `pnpm exec vitest run app/[locale]/admin/consultation-types/adminPage.test.ts app/[locale]/admin/adminDashboardCards.test.ts app/[locale]/admin/admin-users/adminUsersContent.test.tsx`

Expected: FAIL because the route/card/label do not exist.

- [ ] **Step 3: Implement the protected page and dashboard permission label**

The server page sets locale, checks the permission, and redirects unauthorized admins. Add a `BadgeDollarSign` dashboard card in operations and the bilingual permission label.

- [ ] **Step 4: Implement the client UI**

Create a controlled bilingual form for name, immutable code, price, currency, duration, and icon. Disable the code while editing. Render active and archived rows separately, reorder active rows, retain form input on errors, prevent double-submit, confirm archive once, and confirm permanent deletion twice with the second prompt stating it cannot be undone.

Use this card baseline exactly:

```tsx
className="rounded-3xl border border-transparent bg-white p-5 shadow-[0_14px_40px_rgba(7,17,31,0.055)] transition hover:border-white focus-within:border-white"
```

- [ ] **Step 5: Run UI tests and verify GREEN, then commit**

```bash
pnpm exec vitest run app/[locale]/admin/consultation-types/adminPage.test.ts app/[locale]/admin/adminDashboardCards.test.ts app/[locale]/admin/admin-users/adminUsersContent.test.tsx
git add apps/lawyers.bh/app/[locale]/admin
git commit -m "feat: add consultation types admin page"
```

### Task 6: Run integrated verification and prepare release evidence

**Files:**
- Modify only files required to correct failures caused by Tasks 1-5.

**Interfaces:**
- Produces a clean, reviewable feature branch with migration, permission, services, APIs, dynamic booking/payment support, and UI.

- [ ] **Step 1: Run all feature tests**

```bash
pnpm exec vitest run \
  lib/auth/admin-permissions.test.ts \
  lib/consultation-management/*.test.ts \
  lib/booking/consultationMethodCatalog.test.ts \
  lib/discounts/resolve-price.test.ts \
  app/api/admin/consultation-types/routes.test.ts \
  app/api/tap/charge/route.test.ts \
  app/[locale]/admin/consultation-types/adminPage.test.ts \
  app/[locale]/admin/adminDashboardCards.test.ts \
  app/[locale]/admin/admin-users/adminUsersContent.test.tsx
```

Expected: all feature tests PASS with no unhandled errors.

- [ ] **Step 2: Run migration checks**

Run the repository migration/journal tests plus `psql` rehearsal against a disposable/local database using `BEGIN`, migration SQL, verification SQL, then `ROLLBACK`. Expected: verification succeeds and no production data is changed.

```bash
(printf 'BEGIN;\n'; cat drizzle/0074_consultation_types_admin.sql drizzle/verify_0074_consultation_types_admin.sql; printf 'ROLLBACK;\n') | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
```

- [ ] **Step 3: Run static checks**

```bash
pnpm exec tsc --noEmit --incremental false
git diff --name-only --diff-filter=ACMR origin/DEV...HEAD -- '*.ts' '*.tsx' | xargs pnpm exec eslint --quiet
git diff --check origin/DEV...HEAD
```

Expected: exit code 0 for each command. Report any unrelated baseline failure separately and do not modify unrelated files.

- [ ] **Step 4: Run the production-style build**

Use Node 22 from the monorepo root and the repository's build command with a valid non-production database configuration. Expected: migrations/build complete, admin and public catalogue routes appear in output, and page-data collection finishes.

```bash
PATH="/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH" pnpm --filter lawyers.bh build
```

- [ ] **Step 5: Review the final diff and commit verification fixes**

Confirm no secrets, generated caches, unrelated SOS/About conflict files, or local environment files are staged.

```bash
git status --short
git diff --stat origin/DEV...HEAD
git diff --check origin/DEV...HEAD
git add -p
git commit -m "test: verify consultation type administration"
```

Skip the final commit if verification required no code changes. Publishing to DEV/PRODUCTION/Vercel is a separate user-authorized release step after implementation succeeds.
