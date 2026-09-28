# Country Consultation Catalogues and Icon Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each active provisioned country its own consultation catalogue, replace icon text entry with a searchable visual picker, and carry the customer's selected country consistently through booking and payment.

**Architecture:** A shared icon catalogue supplies validated keys and Lucide components to admin and booking UI. Admin state resolves active countries and scopes every request by ISO country code. Booking owns a selected-country state, reloads all dependent catalogue/lawyer data on change, and persists the same code into payment payloads where the server remains the pricing authority.

**Tech Stack:** Next.js App Router, React 19, TypeScript, PostgreSQL country table resolver, Lucide React, Vitest, Tailwind CSS.

## Global Constraints

- List only active, table-provisioned countries.
- Never accept a client-provided SQL table name or prefix.
- Consultation codes are unique per country and may have different prices in different countries.
- Use an explicit tree-shakeable Lucide allowlist, not every package export.
- Unknown legacy icon keys render a neutral fallback; new unknown keys are rejected.
- Country changes clear method, lawyer, date, and time selections.
- Never substitute Bahrain catalogue data for another country's empty or failed catalogue.
- Use the Admins and Permissions two-column layout and red hover/focus borders.
- Preserve historical booking country and method values.

---

### Task 1: Create the shared visual icon catalogue

**Files:**
- Create: `apps/lawyers.bh/lib/consultation-icons/catalog.ts`
- Create: `apps/lawyers.bh/lib/consultation-icons/catalog.test.ts`
- Create: `apps/lawyers.bh/app/[locale]/admin/consultation-types/ConsultationIconPicker.tsx`
- Create: `apps/lawyers.bh/app/[locale]/admin/consultation-types/ConsultationIconPicker.test.tsx`
- Modify: `apps/lawyers.bh/lib/consultation-management/validation.ts`
- Modify: `apps/lawyers.bh/lib/consultation-management/validation.test.ts`

**Interfaces:**
- Produces `CONSULTATION_ICON_KEYS`, `ConsultationIconKey`, `getConsultationIcon(key)`, and `getConsultationIconLabel(key, locale)`.
- `ConsultationIconPicker` consumes `{ value, onChange, isAr }` and emits only `ConsultationIconKey`.

- [ ] **Step 1: Write failing catalogue and validation tests**

Assert that keys such as `phone`, `message-circle`, `video`, `map-pin`, `building-2`, `house`, `headphones`, `calendar`, `scale`, `shield-check`, and `file-text` resolve to real components; unknown read keys return `CircleHelp`; unknown write keys throw `invalid_icon`.

```ts
expect(getConsultationIcon("video")).toBe(Video);
expect(getConsultationIcon("legacy-x")).toBe(CircleHelp);
expect(() => parseConsultationTypeInput({ ...valid, iconKey: "legacy-x" }, { includeCode: true })).toThrow("invalid_icon");
```

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm exec vitest run lib/consultation-icons/catalog.test.ts lib/consultation-management/validation.test.ts`

Expected: FAIL because the icon catalogue is absent and validation still accepts arbitrary slug keys.

- [ ] **Step 3: Implement the allowlist and server validation**

Export a literal record of Lucide imports and bilingual labels. Validate with `isConsultationIconKey(iconKey)` in the existing input parser.

- [ ] **Step 4: Write failing picker interaction tests**

Render the picker, search for `video`, select the visible icon button, and assert `onChange("video")`. Assert the chosen icon receives selected styling and the grid has an accessible label.

- [ ] **Step 5: Implement picker, verify GREEN, and commit**

Use a button-triggered searchable grid, keyboard-accessible buttons, localized labels, and a selected-state ring.

```bash
pnpm exec vitest run lib/consultation-icons/catalog.test.ts lib/consultation-management/validation.test.ts 'app/[locale]/admin/consultation-types/ConsultationIconPicker.test.tsx'
git add apps/lawyers.bh/lib/consultation-icons apps/lawyers.bh/lib/consultation-management apps/lawyers.bh/app/[locale]/admin/consultation-types/ConsultationIconPicker.tsx apps/lawyers.bh/app/[locale]/admin/consultation-types/ConsultationIconPicker.test.tsx
git commit -m "feat: add visual consultation icon picker"
```

### Task 2: Make consultation administration country-aware and match Admin Users layout

**Files:**
- Modify: `apps/lawyers.bh/app/api/admin/countries/route.ts`
- Modify: `apps/lawyers.bh/app/api/admin/consultation-types/routes.test.ts`
- Modify: `apps/lawyers.bh/lib/consultation-management/service.test.ts`
- Modify: `apps/lawyers.bh/app/[locale]/admin/consultation-types/ConsultationTypesContent.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/admin/consultation-types/adminPage.test.ts`

**Interfaces:**
- Admin countries response: `{ ok, countries: Array<{ code, nameAr, nameEn, currencyCode }> }`.
- Every consultation admin request includes the selected `countryCode`.

- [ ] **Step 1: Write failing country-isolation tests**

Prove that identical `phone` codes can be returned from Bahrain and Saudi resolved tables without crossing data, and that all create/update/archive/restore/delete/reorder handlers resolve the request country.

- [ ] **Step 2: Run service/route tests and verify RED**

Run: `pnpm exec vitest run lib/consultation-management/service.test.ts app/api/admin/consultation-types/routes.test.ts`

Expected: FAIL for the new two-country assertions and missing admin-country permission protection.

- [ ] **Step 3: Protect the admin-country list and keep safe resolution**

Require `manage_consultation_types` for the catalogue page's country list (or expose a dedicated protected country endpoint), return only active provisioned countries, and retain `getActiveCountry` plus `buildCountryTableSet` for all mutations.

- [ ] **Step 4: Write failing admin UI tests**

Assert country options show localized name/code/currency, changing country resets edit state and uses the new code in GET and all mutations, the form currency defaults from the country, and the layout contains `lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]` plus `hover:border-[#B4232A]`.

- [ ] **Step 5: Rebuild the admin UI and verify GREEN**

Split the minified component into focused functions, use the shared picker, show icons in managed cards, and provide active/archive empty states.

- [ ] **Step 6: Commit**

```bash
git add apps/lawyers.bh/app/api/admin/countries apps/lawyers.bh/app/api/admin/consultation-types apps/lawyers.bh/lib/consultation-management apps/lawyers.bh/app/[locale]/admin/consultation-types
git commit -m "feat: manage consultation catalogues by country"
```

### Task 3: Add customer country selection and reload dependent booking data

**Files:**
- Create: `apps/lawyers.bh/app/[locale]/book-appointment/_components/book-appointment/countrySelection.ts`
- Create: `apps/lawyers.bh/app/[locale]/book-appointment/_components/book-appointment/countrySelection.test.ts`
- Modify: `apps/lawyers.bh/app/[locale]/book-appointment/_components/book-appointment/types.ts`
- Modify: `apps/lawyers.bh/app/[locale]/book-appointment/_components/book-appointment/useBookAppointmentState.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/book-appointment/_components/book-appointment/steps/ServiceStep.tsx`

**Interfaces:**
- Booking state exposes `countries`, `selectedCountryCode`, `selectedCountry`, `setSelectedCountryCode`, `countriesLoading`, and `catalogueError`.
- `resetCountryDependentSelection()` clears consultation type, selected lawyer, date, time, and video provider.

- [ ] **Step 1: Write failing pure state tests**

Assert selection accepts only returned countries, defaults to `BH` only if present (otherwise first active country), creates `/api/consultation-methods?countryCode=SA`, and produces an empty method list rather than Bahrain fallback when Saudi has none.

- [ ] **Step 2: Run and verify RED**

Run: `pnpm exec vitest run 'app/[locale]/book-appointment/_components/book-appointment/countrySelection.test.ts'`

Expected: FAIL because the helper/state does not exist.

- [ ] **Step 3: Implement country loading and dependent reset**

Load `/api/countries?channel=website`, then fetch methods using `encodeURIComponent(selectedCountryCode)`. Change available-lawyer calls from fixed/default country to the same code. On change, clear method/lawyer/date/time and do not install local method fallbacks for an empty non-Bahrain response.

- [ ] **Step 4: Render the localized country selector and icon cards**

Place the selector before consultation types in `ServiceStep`. Render each method's shared Lucide icon and show a localized no-types/retry state that disables progression.

- [ ] **Step 5: Run focused booking tests and commit**

```bash
pnpm exec vitest run 'app/[locale]/book-appointment/_components/book-appointment/countrySelection.test.ts'
git add apps/lawyers.bh/app/[locale]/book-appointment/_components/book-appointment
git commit -m "feat: select consultation country during booking"
```

### Task 4: Preserve the selected country through price and payment flows

**Files:**
- Modify: `apps/lawyers.bh/app/[locale]/payment/paymentDraft.ts`
- Create: `apps/lawyers.bh/app/[locale]/payment/paymentDraft.test.ts`
- Modify: `apps/lawyers.bh/app/[locale]/book-appointment/_components/book-appointment/useBookAppointmentState.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/payment/DiscountCodeField.tsx`
- Create: `apps/lawyers.bh/lib/discounts/resolve-price.test.ts`
- Create: `apps/lawyers.bh/app/api/tap/charge/route.test.ts`
- Modify: `apps/lawyers.bh/app/api/yourgpt/payment-session/route.ts`
- Create: `apps/lawyers.bh/app/api/yourgpt/payment-session/route.test.ts`

**Interfaces:**
- `BookAppointmentPaymentDraft` requires `countryCode: string`.
- Discount, Tap, and YourGPT appointment payloads consume the same ISO code.

- [ ] **Step 1: Write failing persistence and pricing tests**

Create a Saudi draft with `countryCode: "SA"`; assert serialization/restoration retains it, the discount resolver queries Saudi, Tap finds the method in Saudi, and YourGPT no longer hard-codes `BH`.

```ts
expect(readBookAppointmentPaymentDraft()?.countryCode).toBe("SA");
expect(await resolveOriginalPrice({ countryCode: "SA", consultationMethod: "phone" })).toMatchObject({ amountBd: "40.000" });
```

- [ ] **Step 2: Run and verify RED**

Run: `pnpm exec vitest run 'app/[locale]/payment/paymentDraft.test.ts' lib/discounts/resolve-price.test.ts app/api/tap/charge/route.test.ts app/api/yourgpt/payment-session/route.test.ts`

Expected: FAIL where booking draft/YourGPT still omit or force the country.

- [ ] **Step 3: Thread country through all payloads**

Save `selectedCountryCode` in the payment draft; pass it to discount and Tap requests. Parse and validate `body.countryCode` in YourGPT with `getActiveCountry`, then use `country.code` for lawyers, catalogue, booking, and price resolution.

- [ ] **Step 4: Verify GREEN and commit**

```bash
pnpm exec vitest run 'app/[locale]/payment/paymentDraft.test.ts' lib/discounts/resolve-price.test.ts app/api/tap/charge/route.test.ts app/api/yourgpt/payment-session/route.test.ts
git add apps/lawyers.bh/app/[locale]/payment apps/lawyers.bh/app/[locale]/book-appointment apps/lawyers.bh/lib/discounts apps/lawyers.bh/app/api/tap apps/lawyers.bh/app/api/yourgpt
git commit -m "feat: preserve consultation country through payment"
```

### Task 5: Integrated verification and visual QA

**Files:**
- Modify only feature files required by a reproduced failing check.

**Interfaces:**
- Produces a clean feature branch ready for a separately authorized DEV/PRODUCTION/Vercel release.

- [ ] **Step 1: Run all focused suites**

```bash
pnpm exec vitest run lib/consultation-icons lib/consultation-management lib/booking/consultationMethodCatalog.test.ts app/api/admin/consultation-types 'app/[locale]/admin/consultation-types' 'app/[locale]/book-appointment/_components/book-appointment/countrySelection.test.ts' 'app/[locale]/payment/paymentDraft.test.ts' lib/discounts/resolve-price.test.ts app/api/tap/charge/route.test.ts app/api/yourgpt/payment-session/route.test.ts
```

Expected: all focused tests pass with zero failures.

- [ ] **Step 2: Run static verification**

```bash
pnpm exec tsc --noEmit --incremental false
git diff --name-only --diff-filter=ACMR origin/DEV...HEAD -- '*.ts' '*.tsx' | xargs pnpm exec eslint --quiet
git diff --check origin/DEV...HEAD
```

- [ ] **Step 3: Run production build**

From the monorepo root with Node 22 and valid non-production database variables:

```bash
PATH="/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH" pnpm --filter lawyers.bh build
```

- [ ] **Step 4: Perform browser QA**

Verify Arabic and English desktop/mobile views: country switching, searchable icon selection, selected icon previews, two-column admin layout, red hover borders, empty country catalogue, and booking reset after changing country. Capture screenshots for the implementation record.

- [ ] **Step 5: Review diff and commit only reproduced fixes**

```bash
git status --short
git diff --stat origin/DEV...HEAD
git diff --check origin/DEV...HEAD
git add -p
git commit -m "test: verify country consultation catalogues"
```

Skip the last commit when verification requires no corrections. Do not publish until the user explicitly asks to publish.
