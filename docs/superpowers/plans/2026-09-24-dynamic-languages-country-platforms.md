# Dynamic Languages and Country Platforms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-managed languages and per-country language selection while renaming and separating database activation for Lawyers Platform and LegalSOS.

**Architecture:** PostgreSQL remains the source of truth. A global language catalogue and normalized country translations replace fixed country-language columns at the API boundary, while compatibility fields remain during rollout. Country tables are provisioned once, and independent product flags gate Lawyers Platform and LegalSOS workflows without publishing websites or applications.

**Tech Stack:** Next.js App Router, React, TypeScript, Drizzle ORM, PostgreSQL, Zod, Vitest, Testing Library, pnpm, Vercel.

## Global Constraints

- Arabic, English, and Turkish are seeded as published languages.
- New languages are created as drafts and cannot be enabled for a country until published.
- Language codes are immutable BCP 47-compatible identifiers; direction is explicitly `rtl` or `ltr`.
- Every enabled country has at least one published language and exactly one enabled default language.
- Lawyers Platform has an optional country-specific HTTPS URL.
- LegalSOS always uses `https://legalsos.org` and the mobile application; it has no country-specific URL.
- Product activation affects database-backed services only; it never publishes a website or releases an application.
- Country tables are provisioned once and reused by both products.
- Disabling a product blocks new workflows without deleting tables or historical records.
- Existing Arabic/English country names, URLs, activation state, and default locales must migrate without loss.
- Preserve compatibility fields for deployed clients until all consumers use the canonical fields.
- Use test-driven development and commit each independently reviewable task.

---

## File map

### New files

- `apps/lawyers.bh/drizzle/0112_dynamic_languages_country_platforms.sql` — schema, seed, backfill, compatibility, and idempotent activation function.
- `apps/lawyers.bh/drizzle/verify_0112_dynamic_languages_country_platforms.sql` — migration invariants.
- `apps/lawyers.bh/lib/countries/languages.ts` — language types and pure validation/normalization.
- `apps/lawyers.bh/lib/countries/language-store.ts` — language catalogue and country-language persistence.
- `apps/lawyers.bh/lib/countries/platform-activation.ts` — idempotent platform activation boundary.
- `apps/lawyers.bh/app/api/admin/languages/route.ts` — list/create languages.
- `apps/lawyers.bh/app/api/admin/languages/[code]/route.ts` — update/publish a language.
- `apps/lawyers.bh/app/api/admin/countries/[code]/languages/route.ts` — country translation, enabled-language, and default-language mutation.
- `apps/lawyers.bh/app/api/admin/countries/[code]/platforms/route.ts` — platform activation mutation.
- `apps/lawyers.bh/app/[locale]/admin/languages/page.tsx` — protected language management page.
- `apps/lawyers.bh/app/[locale]/admin/languages/Content.tsx` — language catalogue UI.
- Focused `*.test.ts` and `*.test.tsx` files beside the modules/routes/components above.

### Modified files

- `apps/lawyers.bh/drizzle/meta/_journal.json` — register migration `0111`.
- `apps/lawyers.bh/lib/db/schema.ts` — Drizzle models for languages, translations, country-language memberships, and canonical product fields.
- `apps/lawyers.bh/lib/countries/catalog.ts` — canonical country response and compatibility mapping.
- `apps/lawyers.bh/lib/countries/store.ts` — assemble countries with translations, language membership, and product readiness.
- `apps/lawyers.bh/lib/db/country-tables.ts` — expose platform-ready country lookup without changing table naming.
- `apps/lawyers.bh/app/api/admin/country-settings/route.ts` — restrict generic settings to background and Lawyers URL.
- `apps/lawyers.bh/app/api/countries/route.ts` — accept canonical product names and return translations/languages.
- `apps/lawyers.bh/app/[locale]/admin/countries/Content.tsx` — product-specific controls and country languages.
- `apps/lawyers.bh/app/[locale]/admin/countries/country-view.ts` — new summary/readiness names.
- `apps/lawyers.bh/app/[locale]/admin/page.tsx` — add Language Management and update country copy.
- `apps/legal-sos-website/lib/countries.ts` and `lib/app-countries.ts` — consume translation maps and canonical LegalSOS enablement.
- Existing country, route, admin, and LegalSOS tests — compatibility assertions.

---

### Task 1: Database schema, seed, and compatibility migration

**Files:**
- Create: `apps/lawyers.bh/drizzle/0112_dynamic_languages_country_platforms.sql`
- Create: `apps/lawyers.bh/drizzle/verify_0112_dynamic_languages_country_platforms.sql`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Modify: `apps/lawyers.bh/lib/db/schema.ts`
- Test: `apps/lawyers.bh/lib/countries/dynamic-language-migration.test.ts`

**Interfaces:**
- Produces tables `platform_languages`, `country_language_settings`, and `country_translations`.
- Produces canonical columns `lawyers_platform_enabled`, `legal_sos_enabled`, and `lawyers_platform_url` on `country_channel_settings`.
- Produces SQL function `activate_country_platform(p_code varchar, p_platform text)` returning the updated country/platform state.

- [ ] **Step 1: Write the failing migration contract test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("drizzle/0112_dynamic_languages_country_platforms.sql", "utf8");
const verification = readFileSync("drizzle/verify_0112_dynamic_languages_country_platforms.sql", "utf8");

describe("dynamic language and product migration", () => {
  it("seeds published ar, en, and tr and backfills compatibility values", () => {
    for (const code of ["ar", "en", "tr"]) expect(migration).toContain(`'${code}'`);
    expect(migration).toContain("lawyers_platform_enabled");
    expect(migration).toContain("legal_sos_enabled");
    expect(migration).toContain("activate_country_platform");
    expect(verification).toContain("RAISE EXCEPTION");
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails because migration `0111` is absent**

Run: `pnpm --filter lawyers.bh test -- lib/countries/dynamic-language-migration.test.ts`

- [ ] **Step 3: Implement the migration**

Create normalized tables with checks and foreign keys:

```sql
CREATE TABLE IF NOT EXISTS public.platform_languages (
  code varchar(35) PRIMARY KEY CHECK (code ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  admin_name text NOT NULL CHECK (btrim(admin_name) <> ''),
  native_name text NOT NULL CHECK (btrim(native_name) <> ''),
  direction varchar(3) NOT NULL CHECK (direction IN ('rtl', 'ltr')),
  status varchar(10) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  updated_by uuid REFERENCES public.admin_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.country_translations (
  country_code varchar(2) NOT NULL REFERENCES public.countries(code) ON DELETE CASCADE,
  language_code varchar(35) NOT NULL REFERENCES public.platform_languages(code),
  name text NOT NULL CHECK (btrim(name) <> ''),
  PRIMARY KEY (country_code, language_code)
);

CREATE TABLE IF NOT EXISTS public.country_language_settings (
  country_code varchar(2) NOT NULL REFERENCES public.countries(code) ON DELETE CASCADE,
  language_code varchar(35) NOT NULL REFERENCES public.platform_languages(code),
  is_default boolean NOT NULL DEFAULT false,
  PRIMARY KEY (country_code, language_code)
);
```

Add canonical product columns, backfill them from `website_enabled`, `app_enabled`, and `website_url`, seed `ar/en/tr`, migrate `name_ar/name_en`, and preserve every valid `default_locale`. Add a partial unique index enforcing one default per country. The activation function must lock the country row, call existing provisioning through the supported `countries.is_active` transition only when `tables_provisioned = false`, then set the requested canonical product flag. It must never drop tables.

- [ ] **Step 4: Add Drizzle schema declarations and register the migration journal entry**

Use exported names `platformLanguages`, `countryTranslations`, and `countryLanguageSettings`; map canonical fields on `countryChannelSettings` as `lawyersPlatformEnabled`, `legalSosEnabled`, and `lawyersPlatformUrl`. Retain legacy fields during compatibility rollout.

- [ ] **Step 5: Run migration contract and schema type checks**

Run: `pnpm --filter lawyers.bh test -- lib/countries/dynamic-language-migration.test.ts`

Run: `pnpm --filter lawyers.bh exec tsc --noEmit`

Expected: both pass.

- [ ] **Step 6: Run the SQL verification against the dedicated integration database**

Run the repository’s existing migration runner with `CLIENT_AUTH_TEST_DATABASE_URL`, then execute `verify_0112_dynamic_languages_country_platforms.sql`. If the dedicated URL is absent, record the check as skipped rather than claiming database verification.

- [ ] **Step 7: Commit**

```bash
git add apps/lawyers.bh/drizzle apps/lawyers.bh/lib/db/schema.ts apps/lawyers.bh/lib/countries/dynamic-language-migration.test.ts
git commit -m "feat: add dynamic country language schema"
```

### Task 2: Pure language and country-platform domain contracts

**Files:**
- Create: `apps/lawyers.bh/lib/countries/languages.ts`
- Create: `apps/lawyers.bh/lib/countries/languages.test.ts`
- Modify: `apps/lawyers.bh/lib/countries/catalog.ts`
- Modify: `apps/lawyers.bh/lib/countries/catalog.test.ts`

**Interfaces:**
- Produces `LanguageCode`, `PlatformLanguage`, `CountryTranslation`, `CountryLanguageSelection`.
- Produces `parseLanguageCreate`, `parseLanguageUpdate`, `parseCountryLanguageUpdate`, and canonical `CountryProduct` values `lawyers` and `legal_sos`.
- Produces `ManagedCountry.translations`, `.languages`, `.lawyersPlatformEnabled`, `.legalSosEnabled`, and `.lawyersPlatformUrl`.

- [ ] **Step 1: Write failing domain tests**

```ts
expect(parseLanguageCreate({ code: "TR", adminName: "Turkish", nativeName: "Türkçe", direction: "ltr" }))
  .toEqual({ code: "tr", adminName: "Turkish", nativeName: "Türkçe", direction: "ltr", status: "draft" });
expect(() => parseLanguageCreate({ code: "bad_code", adminName: "x", nativeName: "x", direction: "ltr" })).toThrow();
expect(() => parseCountryLanguageUpdate({ enabledLanguages: ["ar"], defaultLanguage: "en", translations: { ar: "البحرين" } })).toThrow();
expect(visibleCountries(countries, "legal_sos")).toHaveLength(1);
```

- [ ] **Step 2: Run focused tests and confirm missing exports fail**

Run: `pnpm --filter lawyers.bh test -- lib/countries/languages.test.ts lib/countries/catalog.test.ts`

- [ ] **Step 3: Implement strict pure parsers and canonical compatibility mapping**

```ts
export type CountryProduct = "lawyers" | "legal_sos";
export type LanguageDirection = "rtl" | "ltr";
export type LanguageStatus = "draft" | "published";
export type PlatformLanguage = {
  code: string; adminName: string; nativeName: string;
  direction: LanguageDirection; status: LanguageStatus;
};
```

Normalize codes to lowercase, limit strings, reject unknown keys, and ensure the default is included in `enabledLanguages`. Map legacy API channel `website` to `lawyers` and `app` to `legal_sos` only inside a compatibility parser.

- [ ] **Step 4: Run focused tests**

Run: `pnpm --filter lawyers.bh test -- lib/countries/languages.test.ts lib/countries/catalog.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/lawyers.bh/lib/countries/languages.ts apps/lawyers.bh/lib/countries/languages.test.ts apps/lawyers.bh/lib/countries/catalog.ts apps/lawyers.bh/lib/countries/catalog.test.ts
git commit -m "feat: define language and country product contracts"
```

### Task 3: Language and platform persistence services

**Files:**
- Create: `apps/lawyers.bh/lib/countries/language-store.ts`
- Create: `apps/lawyers.bh/lib/countries/language-store.test.ts`
- Create: `apps/lawyers.bh/lib/countries/platform-activation.ts`
- Create: `apps/lawyers.bh/lib/countries/platform-activation.test.ts`
- Modify: `apps/lawyers.bh/lib/countries/store.ts`
- Modify: `apps/lawyers.bh/lib/countries/store.test.ts`
- Modify: `apps/lawyers.bh/lib/db/country-tables.ts`

**Interfaces:**
- Produces `listLanguages(): Promise<PlatformLanguage[]>`.
- Produces `createLanguage(input, adminId)`, `updateLanguage(code, input, adminId)`, and `publishLanguage(code, adminId)`.
- Produces `saveCountryLanguages(countryCode, input)` as one transaction.
- Produces `activateCountryPlatform(countryCode, product)` and `setCountryPlatformEnabled(countryCode, product, enabled)`.
- Produces `loadManagedCountries()` with canonical fields and compatibility aliases.

- [ ] **Step 1: Write failing store tests using mocked Drizzle transactions**

Cover: immutable codes, draft enablement rejection, exactly one default, country translation upserts, first activation provisioning, second activation reuse, repeat activation idempotency, and disabling without deletion.

```ts
await expect(saveCountryLanguages("BH", {
  enabledLanguages: ["ar", "tr"], defaultLanguage: "ar",
  translations: { ar: "البحرين", tr: "Bahreyn" },
})).resolves.toMatchObject({ defaultLanguage: "ar" });
expect(transaction.execute).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run focused tests and confirm failures**

Run: `pnpm --filter lawyers.bh test -- lib/countries/language-store.test.ts lib/countries/platform-activation.test.ts lib/countries/store.test.ts`

- [ ] **Step 3: Implement transactional persistence**

`saveCountryLanguages` must lock the country, query all referenced languages, reject any non-published code, replace membership rows, upsert provided translations, and update `countries.default_locale` in one transaction. `publishLanguage` must validate that the required administrative/native labels exist before switching status.

- [ ] **Step 4: Implement idempotent platform activation**

Call `SELECT * FROM activate_country_platform(${countryCode}, ${product})`. A disable operation updates only the canonical product flag. Do not set `countries.is_active = false`, clear `tables_provisioned`, or delete country tables.

- [ ] **Step 5: Extend managed-country loading**

Load settings, infrastructure, memberships, translations, and languages in bounded queries. Assemble translation maps in memory. Preserve `appEnabled`, `websiteEnabled`, and `websiteUrl` aliases until clients migrate.

- [ ] **Step 6: Run focused tests and TypeScript**

Run: `pnpm --filter lawyers.bh test -- lib/countries/language-store.test.ts lib/countries/platform-activation.test.ts lib/countries/store.test.ts`

Run: `pnpm --filter lawyers.bh exec tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add apps/lawyers.bh/lib/countries apps/lawyers.bh/lib/db/country-tables.ts
git commit -m "feat: persist country languages and platform activation"
```

### Task 4: Protected administration APIs

**Files:**
- Create: `apps/lawyers.bh/app/api/admin/languages/route.ts`
- Create: `apps/lawyers.bh/app/api/admin/languages/route.test.ts`
- Create: `apps/lawyers.bh/app/api/admin/languages/[code]/route.ts`
- Create: `apps/lawyers.bh/app/api/admin/languages/[code]/route.test.ts`
- Create: `apps/lawyers.bh/app/api/admin/countries/[code]/languages/route.ts`
- Create: `apps/lawyers.bh/app/api/admin/countries/[code]/languages/route.test.ts`
- Create: `apps/lawyers.bh/app/api/admin/countries/[code]/platforms/route.ts`
- Create: `apps/lawyers.bh/app/api/admin/countries/[code]/platforms/route.test.ts`
- Modify: `apps/lawyers.bh/app/api/admin/country-settings/route.ts`
- Modify: `apps/lawyers.bh/app/api/admin/country-settings/route.test.ts`

**Interfaces:**
- `GET/POST /api/admin/languages` lists or creates catalogue records.
- `PATCH /api/admin/languages/:code` updates metadata or publishes.
- `PUT /api/admin/countries/:code/languages` atomically saves enabled/default languages and translations.
- `PUT /api/admin/countries/:code/platforms` accepts `{ product: "lawyers" | "legal_sos", enabled: boolean }`.
- Generic country settings accept only `lawyersPlatformUrl` and `backgroundUrl`.

- [ ] **Step 1: Write failing route tests**

Each mutation test covers missing super-admin access (`403`), cross-origin request (`403`), invalid payload (`400`), persistence failure (`503`), and success with `Cache-Control: no-store`.

```ts
const request = new Request("https://lawyers.bh/api/admin/countries/BH/platforms", {
  method: "PUT",
  headers: { origin: "https://lawyers.bh", "content-type": "application/json" },
  body: JSON.stringify({ product: "legal_sos", enabled: true }),
});
expect((await PUT(request, { params: Promise.resolve({ code: "BH" }) })).status).toBe(200);
```

- [ ] **Step 2: Run route tests and confirm missing routes fail**

Run: `pnpm --filter lawyers.bh test -- app/api/admin/languages app/api/admin/countries app/api/admin/country-settings/route.test.ts`

- [ ] **Step 3: Implement route handlers with shared authorization/origin pattern**

Use `requireSuperAdmin()`, compare `request.headers.get("origin")` with `new URL(request.url).origin`, parse only through Task 2 contracts, and return stable `{ ok, ... }` envelopes. Never return raw database errors.

- [ ] **Step 4: Narrow the legacy settings endpoint**

Remove product boolean mutation from `country-settings`; accept canonical `lawyersPlatformUrl` and background operations only. Keep read-response aliases for deployed clients.

- [ ] **Step 5: Run route tests and TypeScript**

Run: `pnpm --filter lawyers.bh test -- app/api/admin/languages app/api/admin/countries app/api/admin/country-settings/route.test.ts`

Run: `pnpm --filter lawyers.bh exec tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add apps/lawyers.bh/app/api/admin
git commit -m "feat: add language and platform admin APIs"
```

### Task 5: Language Management administration page

**Files:**
- Create: `apps/lawyers.bh/app/[locale]/admin/languages/page.tsx`
- Create: `apps/lawyers.bh/app/[locale]/admin/languages/Content.tsx`
- Create: `apps/lawyers.bh/app/[locale]/admin/languages/Content.test.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/admin/page.tsx`
- Test: `apps/lawyers.bh/app/[locale]/admin/adminPage.test.tsx`

**Interfaces:**
- Consumes Task 4 language endpoints.
- Produces a super-admin-only page at `/:locale/admin/languages`.

- [ ] **Step 1: Write failing presentation and interaction tests**

Assert Arabic/English labels, `dir` handling, create-as-draft payload, invalid-code feedback, published-state badge, immutable code after creation, and disabled publish button when readiness is false.

```tsx
expect(screen.getByRole("heading", { name: "إدارة اللغات" })).toBeInTheDocument();
fireEvent.change(screen.getByLabelText("رمز اللغة"), { target: { value: "fr" } });
fireEvent.click(screen.getByRole("button", { name: "إضافة كمسودة" }));
expect(fetch).toHaveBeenCalledWith("/api/admin/languages", expect.objectContaining({ method: "POST" }));
```

- [ ] **Step 2: Run tests and confirm missing page/component failures**

Run: `pnpm --filter lawyers.bh test -- app/[locale]/admin/languages app/[locale]/admin/adminPage.test.tsx`

- [ ] **Step 3: Implement the protected page and focused client component**

The server page calls `requireSuperAdmin()` and redirects non-super-admins. The client component loads with no-store, supports create/edit/publish, shows `rtl/ltr`, and never offers deletion.

- [ ] **Step 4: Add the administration dashboard card**

Use Arabic title `إدارة اللغات`, English title `Language management`, and copy explaining that new languages remain drafts until translation readiness passes.

- [ ] **Step 5: Run tests, lint, and TypeScript**

Run: `pnpm --filter lawyers.bh test -- app/[locale]/admin/languages app/[locale]/admin/adminPage.test.tsx`

Run: `pnpm --filter lawyers.bh lint`

Run: `pnpm --filter lawyers.bh exec tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add apps/lawyers.bh/app/[locale]/admin/languages apps/lawyers.bh/app/[locale]/admin/page.tsx apps/lawyers.bh/app/[locale]/admin/adminPage.test.tsx
git commit -m "feat: add language management admin"
```

### Task 6: Country administration for products, links, and languages

**Files:**
- Modify: `apps/lawyers.bh/app/[locale]/admin/countries/Content.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/admin/countries/Content.test.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/admin/countries/country-view.ts`
- Modify: `apps/lawyers.bh/app/[locale]/admin/countries/country-view.test.ts`

**Interfaces:**
- Consumes Task 4 country-language and country-platform endpoints.
- Renders independent Lawyers Platform and LegalSOS database states.

- [ ] **Step 1: Replace old presentation tests with failing product-language tests**

Assert the page contains `منصة محامون`, `النجدة القانونية`, `تفعيل قاعدة البيانات`, the editable Lawyers Platform URL, fixed `legalsos.org`, app wording, enabled-language controls, default-language control, and no generic `تفعيل الموقع`/`تفعيل التطبيق` labels.

- [ ] **Step 2: Run focused tests and confirm failure against the old UI**

Run: `pnpm --filter lawyers.bh test -- app/[locale]/admin/countries`

- [ ] **Step 3: Split the large card into focused local components**

Keep the public component export stable, but extract `CountryLanguagesPanel` and `CountryPlatformPanel` into files beside `Content.tsx` if the main file exceeds 250 lines. Each panel owns one mutation and exposes `onSaved(updatedCountry)`.

- [ ] **Step 4: Implement language editing**

Only published global languages appear as enablement options. Require a non-empty translation for every newly enabled language. Prevent removing the current default until another enabled default is selected. Save all language changes atomically through the country-language endpoint.

- [ ] **Step 5: Implement product controls**

Use independent switches labelled as database activation. Lawyers Platform shows its editable HTTPS URL. LegalSOS shows a read-only destination with `https://legalsos.org` and “LegalSOS mobile application”. Show physical table readiness separately from each product flag. Require confirmation before disabling a product and state that historical data is retained.

- [ ] **Step 6: Update summary and readiness helpers**

Return `{ total, lawyersEnabled, legalSosEnabled, tablesReady }`. Do not label `tablesProvisioned` as product activation.

- [ ] **Step 7: Run focused tests and accessibility assertions**

Run: `pnpm --filter lawyers.bh test -- app/[locale]/admin/countries`

Expected: all controls have labels, status messages use `role=status`, failures use `role=alert`, and Arabic layout is RTL.

- [ ] **Step 8: Commit**

```bash
git add apps/lawyers.bh/app/[locale]/admin/countries
git commit -m "feat: manage country languages and product databases"
```

### Task 7: Public country API and LegalSOS compatibility

**Files:**
- Modify: `apps/lawyers.bh/app/api/countries/route.ts`
- Modify: `apps/lawyers.bh/app/api/countries/route.test.ts`
- Modify: `apps/legal-sos-website/lib/countries.ts`
- Modify: `apps/legal-sos-website/lib/app-countries.ts`
- Modify: `apps/legal-sos-website/test/app-countries.test.ts`
- Modify: affected LegalSOS country selector tests.

**Interfaces:**
- Canonical query: `/api/countries?product=lawyers|legal_sos`.
- Temporary compatibility query: `channel=website|app` maps to the canonical product.
- Country payload includes `translations: Record<string,string>`, `enabledLanguages: string[]`, `defaultLanguage`, canonical product readiness, and legacy `nameAr/nameEn` values.

- [ ] **Step 1: Write failing API and LegalSOS adapter tests**

```ts
expect(payload.countries[0]).toMatchObject({
  code: "BH",
  translations: { ar: "البحرين", en: "Bahrain", tr: "Bahreyn" },
  enabledLanguages: ["ar", "en", "tr"],
  legalSosEnabled: true,
});
```

Test that LegalSOS excludes countries without `legalSosEnabled`, resolves the current locale from `translations`, and falls back to default then English then country code.

- [ ] **Step 2: Run focused tests and confirm canonical fields are missing**

Run: `pnpm --filter lawyers.bh test -- app/api/countries/route.test.ts`

Run: `pnpm --filter legal-sos-website test -- test/app-countries.test.ts`

- [ ] **Step 3: Implement canonical API response and compatibility parser**

Reject conflicting `product` and `channel` values. Return no-store responses. Continue returning `nameAr`, `nameEn`, `appEnabled`, and `websiteEnabled` during rollout, but derive them from canonical state.

- [ ] **Step 4: Update the LegalSOS adapter**

Represent country names as `Record<string,string>` internally. Keep existing `ar/en/tr` view types until the full runtime translation project expands public route support. Never read or accept a country-specific LegalSOS URL.

- [ ] **Step 5: Run both application test suites for affected areas**

Run: `pnpm --filter lawyers.bh test -- app/api/countries/route.test.ts lib/countries`

Run: `pnpm --filter legal-sos-website test -- test/app-countries.test.ts test/i18n.test.ts`

- [ ] **Step 6: Commit**

```bash
git add apps/lawyers.bh/app/api/countries apps/legal-sos-website/lib apps/legal-sos-website/test/app-countries.test.ts
git commit -m "feat: expose product-aware country languages"
```

### Task 8: Gate product workflows independently

**Files:**
- Create: `apps/lawyers.bh/lib/countries/product-access.ts`
- Create: `apps/lawyers.bh/lib/countries/product-access.test.ts`
- Modify: `apps/lawyers.bh/app/api/join/route.ts`
- Modify: `apps/lawyers.bh/app/api/mobile/lawyers/register/route.ts`
- Modify: `apps/lawyers.bh/app/api/mobile/lawyers/route.ts`
- Modify: `apps/lawyers.bh/app/api/provider/login/route.ts`
- Modify: `apps/lawyers.bh/app/api/provider/forgot-password/route.ts`
- Modify: `apps/lawyers.bh/app/api/consultation-methods/route.ts`
- Modify: `apps/lawyers.bh/app/api/sos/route.ts`
- Modify: `apps/lawyers.bh/app/api/sos/case-types/route.ts`
- Modify: `apps/lawyers.bh/app/api/sos/dispatch/route.ts`
- Modify: `apps/lawyers.bh/app/api/sos/lawyer/join/route.ts`
- Modify: `apps/lawyers.bh/app/api/sos/lawyer/login/route.ts`
- Modify: `apps/lawyers.bh/app/api/sos/lawyer/shifts/route.ts`
- Modify: `apps/lawyers.bh/app/api/sos/lawyer/push/subscribe/route.ts`
- Test: `apps/lawyers.bh/app/api/mobile/lawyers/register/route.test.ts`
- Test: `apps/lawyers.bh/app/api/mobile/lawyers/route.test.ts`
- Test: `apps/lawyers.bh/app/api/sos/lawyer/case/[caseRef]/accept/route.test.ts`
- Test: focused tests colocated with the modified routes when an existing route has no product-access coverage.

**Interfaces:**
- Produces `requireCountryProduct(code, product): Promise<ActiveCountry>`.
- Lawyers workflows require product `lawyers`; SOS workflows require `legal_sos`.

- [ ] **Step 1: Verify the fixed entry-point inventory before editing**

Run: `rg -n "getActiveCountry|tablesProvisioned|servicesActive|appEnabled|websiteEnabled" apps/lawyers.bh --glob '*.ts' --glob '*.tsx'`

Confirm the file list above still contains every public entry point for provider registration/directory/consultations and SOS creation/catalogue/dispatch/lawyer availability. If a newly added route delegates to one of these services, gate the shared service rather than duplicating checks. Read-only historical administration remains accessible when a product is disabled.

- [ ] **Step 2: Write failing access tests**

```ts
await expect(requireCountryProduct("SA", "lawyers")).rejects.toThrow("COUNTRY_PRODUCT_DISABLED");
await expect(requireCountryProduct("SA", "legal_sos")).resolves.toMatchObject({ code: "SA" });
```

Add route tests proving disabled Lawyers Platform blocks new registration but not LegalSOS, and disabled LegalSOS blocks new SOS requests but not provider administration.

- [ ] **Step 3: Run focused tests and confirm current shared readiness is too broad**

Run: `pnpm --filter lawyers.bh test -- lib/countries/product-access.test.ts`

- [ ] **Step 4: Implement and apply the product access boundary**

Load physical readiness and canonical product flags together. Throw a stable domain error before any insert, payment initiation, notification, or dispatch side effect. Do not retroactively hide historical records.

- [ ] **Step 5: Run provider and SOS regression tests**

Run:

```bash
pnpm --filter lawyers.bh test -- lib/countries/product-access.test.ts app/api/mobile/lawyers/register/route.test.ts app/api/mobile/lawyers/route.test.ts app/api/sos/lawyer/case/[caseRef]/accept/route.test.ts
```

Expected: new-workflow gating is independent and all historical/read-only expectations remain green.

- [ ] **Step 6: Commit**

```bash
git add apps/lawyers.bh/lib/countries/product-access.ts apps/lawyers.bh/lib/countries/product-access.test.ts apps/lawyers.bh/app/api apps/lawyers.bh/lib
git commit -m "feat: gate country workflows by product"
```

### Task 9: Full verification, compatibility evidence, and release readiness

**Files:**
- Modify only files required to resolve failures caused by Tasks 1–8.
- Do not change unrelated dirty files from the primary worktree.

**Interfaces:**
- Consumes all prior task outputs.
- Produces a release candidate with separated evidence for tests, database, Git, deployment, and live behavior.

- [ ] **Step 1: Run all Lawyers.bh checks with Node 22**

Run:

```bash
pnpm --filter lawyers.bh test
pnpm --filter lawyers.bh exec tsc --noEmit
pnpm --filter lawyers.bh lint
pnpm --filter lawyers.bh build:next-only
```

Expected: all pass. Record warnings separately; do not describe warnings as failures or ignore new errors.

- [ ] **Step 2: Run all LegalSOS website checks**

Run:

```bash
pnpm --filter legal-sos-website test
pnpm --filter legal-sos-website typecheck
pnpm --filter legal-sos-website lint
pnpm --filter legal-sos-website build
```

Expected: all pass.

- [ ] **Step 3: Verify the migration against a dedicated database**

Apply through the repository migration runner, execute `verify_0112_dynamic_languages_country_platforms.sql`, and query only counts/statuses needed to prove `ar/en/tr`, country backfill, one default per country, canonical flags, and preserved URLs. Do not expose credentials or personal data.

- [ ] **Step 4: Inspect the final diff and compatibility surface**

Run: `git diff --check DEV...HEAD`

Run: `git status --short`

Run: `git log --oneline DEV..HEAD`

Confirm no unrelated files, secrets, generated build output, or destructive migration statements are present.

- [ ] **Step 5: Commit verification-only corrections if they were required**

Stage only the files reported by `git status --short` that were changed to fix a Task 9 check. Review their diff, then commit them with `git commit -m "test: verify dynamic country language rollout"`. If no correction was required, do not create an empty commit.

- [ ] **Step 6: Stop before production release unless the user explicitly authorizes publishing**

When authorized, follow the project’s established DEV → PRODUCTION release procedure, apply migrations through the deployment build, verify both Vercel projects are READY, and probe public country APIs plus authenticated admin pages. Report deployment readiness separately from successful database migration and authenticated UI verification.

---

## Completion criteria

- Super admins can add a draft language once and later publish it.
- Arabic, English, and Turkish exist and retain current public behavior.
- Countries can choose published languages, translations, and exactly one default.
- Lawyers Platform and LegalSOS database activation are independent and clearly labelled.
- The first product activation provisions country tables once; the second reuses them.
- Lawyers Platform has a per-country HTTPS URL; LegalSOS has only `legalsos.org` and the mobile app.
- New workflows are blocked when their product is disabled, without deleting history.
- Compatibility clients still receive legacy fields derived from canonical state.
- Tests, type checks, lint, builds, migration verification, Git state, deployment state, and live checks are reported as separate evidence.
