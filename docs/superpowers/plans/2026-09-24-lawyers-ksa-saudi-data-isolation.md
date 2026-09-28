# Lawyers KSA Saudi Data Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every `lawyers.ksa` flow use Saudi tables and Saudi riyals (`SAR`) without reading from or writing to Bahrain business tables.

**Architecture:** Add one server-only KSA context that resolves the active/provisioned Saudi country, validates the Lawyers product gate, exposes a validated Saudi table set, and owns the currency invariant. Convert routes in vertical slices—identity, catalogue/bookings, SOS, payments, administration—so each slice is testable before the next one starts; add additive migrations for missing Saudi financial/onboarding structures.

**Tech Stack:** Next.js 16 App Router, TypeScript 5, React 19, Drizzle ORM, PostgreSQL, Vitest, Tap Payments, Postmark, Web Push.

## Global Constraints

- `apps/lawyers.ksa` always derives country code `SA` on the server.
- New KSA prices and financial records always use currency code `SAR`.
- Public country/currency input cannot select Bahrain tables or `BHD`.
- Missing Saudi activation/provisioning fails explicitly; there is no fallback to Bahrain.
- Migrations are additive and idempotent; Bahrain data is not moved, rewritten, or deleted.
- Historical records retain their stored currency.
- Payment verification uses provider-approved test/sandbox paths and never treats session creation as proof of a charge.
- Implementation follows TDD: failing focused test, minimal implementation, passing focused test, then commit.

---

## File map

**New authoritative modules**

- `apps/lawyers.ksa/lib/ksa/context.ts`: fixed `SA`/`SAR` constants, validated country/table resolution, public-input guard.
- `apps/lawyers.ksa/lib/ksa/money.ts`: SAR formatting and server-side currency/amount assertions.
- `apps/lawyers.ksa/lib/ksa/context.test.ts`: country/table/product-gate tests.
- `apps/lawyers.ksa/lib/ksa/money.test.ts`: SAR enforcement and formatting tests.
- `apps/lawyers.ksa/lib/countries/product-access.ts`: port the existing Lawyers.bh `requireCountryProduct(code, product)` gate and its typed error mapping into the KSA app.

**Database and schema**

- `apps/lawyers.ksa/lib/db/country-tables.ts`: add Saudi-required Tap onboarding suffix and remove BH default behavior from reusable normalization.
- `apps/lawyers.ksa/drizzle/0034_ksa_financial_isolation.sql`: provision Saudi Tap onboarding and country-neutral currency/amount compatibility columns.
- `apps/lawyers.ksa/drizzle/verify_0034_ksa_financial_isolation.sql`: assert tables, columns, constraints, defaults, indexes, and foreign keys.
- `apps/lawyers.ksa/drizzle/meta/_journal.json`: register migration `0034` after the current last journal entry.
- `apps/lawyers.ksa/test/drizzle-journal.test.ts`: require SQL/journal continuity and verifier presence.

**Identity and providers**

- `apps/lawyers.ksa/app/api/join/route.ts`
- `apps/lawyers.ksa/app/api/lawyers/login/route.ts`
- `apps/lawyers.ksa/app/api/provider/login/route.ts`
- `apps/lawyers.ksa/app/api/provider/forgot-password/route.ts`
- `apps/lawyers.ksa/app/api/provider/reset-password/route.ts`
- `apps/lawyers.ksa/app/api/provider/complete-profile/route.ts`
- `apps/lawyers.ksa/app/api/provider/profile/route.ts`
- `apps/lawyers.ksa/app/api/provider/me/route.ts`
- `apps/lawyers.ksa/app/api/provider/[source]/[id]/route.ts`
- `apps/lawyers.ksa/app/api/admin/provider-applications/[id]/approve/route.ts`
- `apps/lawyers.ksa/app/api/admin/provider-applications/[id]/{reactivate,reject,suspend,tap-retry}/route.ts`
- `apps/lawyers.ksa/lib/provider-session.ts` or its current session equivalent: assert `SA` when decoding/creating KSA provider sessions.

**Catalogue, requests, directory, reviews, and admin**

- `apps/lawyers.ksa/app/api/consultation-methods/route.ts`
- `apps/lawyers.ksa/app/api/available-lawyers/route.ts`
- `apps/lawyers.ksa/app/api/booking-review/route.ts`
- `apps/lawyers.ksa/app/api/lawyers/[id]/route.ts`
- `apps/lawyers.ksa/app/api/lawyers/[id]/status/route.ts`
- `apps/lawyers.ksa/app/api/provider/requests/route.ts`
- `apps/lawyers.ksa/app/api/provider/requests/[source]/[id]/route.ts`
- `apps/lawyers.ksa/app/api/admin/requests/route.ts`
- `apps/lawyers.ksa/app/api/yourgpt/{providers,legal-cases,payment-session}/route.ts`

**SOS and live operations**

- `apps/lawyers.ksa/lib/sos/{geo,shifts,emergencyCaseCatalog,caseTypes,lawyerAuth}.ts`
- all route files below `apps/lawyers.ksa/app/api/sos/`

**Payments and settlement**

- all route files below `apps/lawyers.ksa/app/api/tap/`
- `apps/lawyers.ksa/app/api/mobile/tap/{payment-session,payment-confirm,payment-status,live-sdk-session,live-test,test-charge,debug-charges}/route.ts`
- `apps/lawyers.ksa/lib/tap/{mobile-payment-session,mobile-payment-status,onboarding,provider-readiness,provider-activation}.ts`
- `apps/lawyers.ksa/lib/payments/{commission,allocation-policy}.ts`

**Presentation and regression inventory**

- `apps/lawyers.ksa/app/**/*.{ts,tsx}` and `apps/lawyers.ksa/components/**/*.{ts,tsx}` only where `BH`, `BHD`, Bahrain links, or Bahrain phone/address assumptions are shown in a KSA flow.
- New `apps/lawyers.ksa/test/ksa-static-isolation.test.ts`: allowlisted static scan preventing reintroduction of Bahrain business-table or BHD defaults.

---

### Task 1: Authoritative Saudi context and SAR money contract

**Files:**
- Create: `apps/lawyers.ksa/lib/ksa/context.ts`
- Create: `apps/lawyers.ksa/lib/ksa/context.test.ts`
- Create: `apps/lawyers.ksa/lib/ksa/money.ts`
- Create: `apps/lawyers.ksa/lib/ksa/money.test.ts`
- Modify: `apps/lawyers.ksa/lib/db/country-tables.ts`
- Create: `apps/lawyers.ksa/lib/countries/product-access.ts`
- Create: `apps/lawyers.ksa/lib/countries/product-access.test.ts`

**Interfaces:**
- Consumes: `buildCountryTableSet(country)` from `lib/db/country-tables.ts`; the existing `requireCountryProduct(code, product)` implementation in `apps/lawyers.bh/lib/countries/product-access.ts`.
- Produces: `KSA_COUNTRY_CODE: "SA"`, `KSA_CURRENCY_CODE: "SAR"`, `getKsaContext(): Promise<KsaContext>`, `assertKsaInputCountry(value): void`, `assertSarCurrency(value): "SAR"`, and `formatSar(amount, locale): string`.

- [ ] **Step 1: Write failing context tests**

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/countries/product-access", () => ({
  requireCountryProduct: vi.fn(async () => ({
    code: "SA",
    tablePrefix: "saudi",
    nameAr: "السعودية",
    nameEn: "Saudi Arabia",
    currencyCode: "SAR",
    defaultLocale: "ar",
  })),
}));

vi.mock("@/lib/db/country-tables", () => ({
  buildCountryTableSet: vi.fn(() => ({
    lawyers: "saudi_lawyers",
    booking_requests: "saudi_booking_requests",
    emergency_requests: "saudi_emergency_requests",
  })),
}));

describe("KSA context", () => {
  it("always resolves SA, saudi tables, and SAR", async () => {
    const { getKsaContext } = await import("./context");
    const context = await getKsaContext();
    expect(context.country.code).toBe("SA");
    expect(context.country.currencyCode).toBe("SAR");
    expect(context.tables.lawyers).toBe("saudi_lawyers");
  });

  it("rejects a caller supplied Bahrain country", async () => {
    const { assertKsaInputCountry } = await import("./context");
    expect(() => assertKsaInputCountry("BH")).toThrowError("KSA_COUNTRY_REQUIRED");
  });
});
```

- [ ] **Step 2: Run the context tests and confirm failure**

Run: `pnpm --dir apps/lawyers.ksa vitest run lib/ksa/context.test.ts`

Expected: FAIL because `lib/ksa/context.ts` does not exist.

- [ ] **Step 3: Implement the fixed server context**

```ts
import "server-only";
import { requireCountryProduct } from "@/lib/countries/product-access";
import { buildCountryTableSet, type ActiveCountry } from "@/lib/db/country-tables";

export const KSA_COUNTRY_CODE = "SA" as const;
export const KSA_CURRENCY_CODE = "SAR" as const;

export type KsaContext = {
  country: ActiveCountry & { code: "SA"; currencyCode: "SAR" };
  tables: ReturnType<typeof buildCountryTableSet>;
};

export async function getKsaContext(): Promise<KsaContext> {
  const country = await requireCountryProduct(KSA_COUNTRY_CODE, "lawyers");
  if (!country || country.tablePrefix !== "saudi" || country.currencyCode !== KSA_CURRENCY_CODE) {
    throw new Error("KSA_COUNTRY_NOT_PROVISIONED");
  }
  return {
    country: country as KsaContext["country"],
    tables: buildCountryTableSet(country),
  };
}

export function assertKsaInputCountry(value: unknown) {
  if (value != null && String(value).trim() && String(value).trim().toUpperCase() !== KSA_COUNTRY_CODE) {
    throw new Error("KSA_COUNTRY_REQUIRED");
  }
}
```

Copy `apps/lawyers.bh/lib/countries/product-access.ts` and its tests into the KSA app, preserving `CountryProductAccessError`, `requireCountryProduct`, and `mapCountryProductAccessError`. Add `CountryPlatform = "lawyers" | "legal_sos"` to the KSA `country-tables.ts`. Map `COUNTRY_PRODUCT_DISABLED` from this dependency to `KSA_LAWYERS_PLATFORM_DISABLED` at the KSA-context boundary.

- [ ] **Step 4: Write and run failing SAR contract tests**

```ts
import { describe, expect, it } from "vitest";
import { assertSarCurrency, formatSar } from "./money";

describe("SAR money", () => {
  it("rejects BHD", () => expect(() => assertSarCurrency("BHD")).toThrow("KSA_CURRENCY_REQUIRED"));
  it("formats Saudi currency", () => expect(formatSar(150, "en")).toContain("SAR"));
});
```

Run: `pnpm --dir apps/lawyers.ksa vitest run lib/ksa/money.test.ts`

Expected: FAIL because `lib/ksa/money.ts` does not exist.

- [ ] **Step 5: Implement and verify the SAR helper**

```ts
import { KSA_CURRENCY_CODE } from "./context";

export function assertSarCurrency(value: unknown): "SAR" {
  if (String(value ?? KSA_CURRENCY_CODE).toUpperCase() !== KSA_CURRENCY_CODE) {
    throw new Error("KSA_CURRENCY_REQUIRED");
  }
  return KSA_CURRENCY_CODE;
}

export function formatSar(amount: number, locale: "ar" | "en") {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    style: "currency",
    currency: KSA_CURRENCY_CODE,
  }).format(amount);
}
```

Run: `pnpm --dir apps/lawyers.ksa vitest run lib/countries/product-access.test.ts lib/ksa/context.test.ts lib/ksa/money.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the invariant**

```bash
git add apps/lawyers.ksa/lib/ksa apps/lawyers.ksa/lib/countries apps/lawyers.ksa/lib/db/country-tables.ts
git commit -m "feat(ksa): enforce Saudi country and SAR context"
```

### Task 2: Additive Saudi financial and Tap onboarding migration

**Files:**
- Create: `apps/lawyers.ksa/drizzle/0034_ksa_financial_isolation.sql`
- Create: `apps/lawyers.ksa/drizzle/verify_0034_ksa_financial_isolation.sql`
- Modify: `apps/lawyers.ksa/drizzle/meta/_journal.json`
- Modify: `apps/lawyers.ksa/lib/db/country-tables.ts`
- Modify: `apps/lawyers.ksa/test/drizzle-journal.test.ts`

**Interfaces:**
- Consumes: `public.provision_country_tables('SA')`, `public.saudi_lawyers`, and the Bahrain Tap onboarding structure created by migration `0027`.
- Produces: `saudi_tap_retailer_onboarding`; explicit `currency_code` and country-neutral amount compatibility columns required by Saudi bookings/emergencies/payments; table suffix `tap_retailer_onboarding`.

- [ ] **Step 1: Extend the migration-journal test to require the new artifacts**

```ts
expect(journal.entries.at(-1)?.tag).toBe("0034_ksa_financial_isolation");
expect(existsSync(join(drizzleDir, "0034_ksa_financial_isolation.sql"))).toBe(true);
expect(existsSync(join(drizzleDir, "verify_0034_ksa_financial_isolation.sql"))).toBe(true);
```

- [ ] **Step 2: Run the journal test and confirm failure**

Run: `pnpm --dir apps/lawyers.ksa vitest run test/drizzle-journal.test.ts`

Expected: FAIL because migration `0034` and its verifier are absent.

- [ ] **Step 3: Write the idempotent migration**

The SQL must:

```sql
SELECT public.provision_country_tables('SA');

CREATE TABLE IF NOT EXISTS public.saudi_tap_retailer_onboarding
(LIKE public.bahrain_tap_retailer_onboarding INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY);

ALTER TABLE public.saudi_tap_retailer_onboarding
  DROP CONSTRAINT IF EXISTS tap_retailer_onboarding_lawyer_id_bahrain_lawyers_id_fk;

ALTER TABLE public.saudi_tap_retailer_onboarding
  ADD CONSTRAINT saudi_tap_onboarding_lawyer_fk
  FOREIGN KEY (lawyer_id) REFERENCES public.saudi_lawyers(id) ON DELETE CASCADE;
```

Add uniquely named Saudi indexes equivalent to the environment/lawyer, lead, retailer, destination, stage, and retailer indexes from migration `0027`. Add `currency_code text NOT NULL DEFAULT 'SAR'` and country-neutral numeric amount columns to Saudi financial tables only when the canonical columns do not already exist. Populate new amount fields from legacy `*_bhd` fields without changing the legacy values, then constrain new Saudi rows to `currency_code = 'SAR'`.

- [ ] **Step 4: Write the SQL verifier**

The verifier must raise an exception unless:

```sql
to_regclass('public.saudi_tap_retailer_onboarding') IS NOT NULL
```

It must also verify the Saudi-lawyer foreign key, six required onboarding indexes, every new currency/amount column, `SAR` defaults/check constraints, and the absence of any foreign key from a `saudi_*` table to `bahrain_lawyers`.

- [ ] **Step 5: Register and run static migration verification**

Append tag `0034_ksa_financial_isolation` to `_journal.json` with the next numeric index and a timestamp greater than the preceding entry.

Run: `pnpm --dir apps/lawyers.ksa vitest run test/drizzle-journal.test.ts`

Expected: PASS.

- [ ] **Step 6: Run database verification on a dedicated non-production database**

Run: `DATABASE_URL="$KSA_TEST_DATABASE_URL" pnpm --dir apps/lawyers.ksa db:migrate`

Run: `psql "$KSA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/lawyers.ksa/drizzle/verify_0034_ksa_financial_isolation.sql`

Expected: both exit 0. If `KSA_TEST_DATABASE_URL` is not configured, record this layer as unverified and do not substitute production.

- [ ] **Step 7: Commit the database contract**

```bash
git add apps/lawyers.ksa/drizzle apps/lawyers.ksa/lib/db/country-tables.ts apps/lawyers.ksa/test/drizzle-journal.test.ts
git commit -m "feat(ksa): provision Saudi financial tables"
```

### Task 3: Saudi-only lawyer registration, login, sessions, and approvals

**Files:**
- Create: `apps/lawyers.ksa/app/api/join/route.test.ts`
- Create: `apps/lawyers.ksa/app/api/provider/login/route.test.ts`
- Create: `apps/lawyers.ksa/app/api/admin/provider-applications/[id]/approve/route.test.ts`
- Modify: the identity/provider/admin files listed in the File map.

**Interfaces:**
- Consumes: `getKsaContext()`, `assertKsaInputCountry()`, `saudi_tap_retailer_onboarding`.
- Produces: provider sessions fixed to `SA`; Saudi lawyer application/create/read/update operations; Saudi-only admin approval and Tap onboarding.

- [ ] **Step 1: Write route tests that submit `countryCode: "BH"`**

Mock `getKsaContext()` to return `saudi_*` tables and spy on the SQL client. Assert:

```ts
expect(response.status).toBe(400);
expect(await response.json()).toMatchObject({ error: "KSA_COUNTRY_REQUIRED" });
expect(executedSql.join(" ")).not.toContain("bahrain_");
```

Add valid `SA` cases asserting the registration insert and login lookup contain `saudi_lawyers`, and approval inserts/updates contain `saudi_tap_retailer_onboarding`.

- [ ] **Step 2: Run focused identity tests and confirm failure**

Run: `pnpm --dir apps/lawyers.ksa vitest run app/api/join/route.test.ts app/api/provider/login/route.test.ts 'app/api/admin/provider-applications/[id]/approve/route.test.ts'`

Expected: FAIL because current routes default to `BH` and static Bahrain schema tables.

- [ ] **Step 3: Convert registration and login routes**

At each entry point:

```ts
assertKsaInputCountry(body.countryCode);
const { country, tables } = await getKsaContext();
const lawyersTable = sqlClient(tables.lawyers);
```

Use the validated table identifier for queries, write `country.code` into country columns, issue sessions with `SA`, validate Saudi IBAN format (`SA` plus 22 digits), and remove every `|| "BH"` default.

- [ ] **Step 4: Convert provider profile, password, and admin approval lifecycle**

All lookup/update/suspend/reactivate/reject/approve/Tap-retry operations must obtain `tables.lawyers` and `tables.tap_retailer_onboarding` from `getKsaContext()`. Reject any decoded provider session whose country is not `SA` with `401` and error `KSA_SESSION_REQUIRED`.

- [ ] **Step 5: Run focused and provider regression tests**

Run: `pnpm --dir apps/lawyers.ksa vitest run app/api/join/route.test.ts app/api/provider/login/route.test.ts 'app/api/admin/provider-applications/[id]/approve/route.test.ts' lib/tap/onboarding.test.ts lib/tap/provider-activation.test.ts lib/tap/provider-readiness.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit identity isolation**

```bash
git add apps/lawyers.ksa/app/api/join apps/lawyers.ksa/app/api/lawyers apps/lawyers.ksa/app/api/provider apps/lawyers.ksa/app/api/admin/provider-applications apps/lawyers.ksa/lib/provider-session.ts
git commit -m "feat(ksa): isolate Saudi provider identity"
```

### Task 4: Saudi catalogue, directory, bookings, reviews, and administration

**Files:**
- Create: `apps/lawyers.ksa/app/api/consultation-methods/route.test.ts`
- Create: `apps/lawyers.ksa/app/api/available-lawyers/route.test.ts`
- Create: `apps/lawyers.ksa/app/api/admin/requests/route.test.ts`
- Modify: catalogue/request/directory/admin files listed in the File map.

**Interfaces:**
- Consumes: `getKsaContext()`, `assertSarCurrency()`, `formatSar()`.
- Produces: Saudi-only catalogue/directory/booking/review/case reads and writes; KSA admin lists limited to Saudi records.

The current KSA app has no independent client-account, conversation, or chat-attachment table/API. Client identity and messages are embedded in booking/emergency/legal-case records. This task keeps those embedded fields inside the corresponding `saudi_*` request tables; it does not invent a second account or chat subsystem.

- [ ] **Step 1: Write failing route-contract tests**

For catalogue and directory, pass `?countryCode=BH` and assert `400 KSA_COUNTRY_REQUIRED`. For valid requests, assert returned `countryCode` is `SA`, `currencyCode` is `SAR`, and captured SQL references `saudi_consultation_methods` or `saudi_lawyers`.

For admin requests, seed mocked rows from Bahrain and Saudi sources and assert only Saudi results are returned; assert generated SQL has no `bahrain_booking_requests` or `bahrain_emergency_requests`.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `pnpm --dir apps/lawyers.ksa vitest run app/api/consultation-methods/route.test.ts app/api/available-lawyers/route.test.ts app/api/admin/requests/route.test.ts`

Expected: FAIL on current BH defaults/static schema queries.

- [ ] **Step 3: Convert catalogue, directory, reviews, and provider requests**

Resolve table identifiers once per request from `getKsaContext()`. Use `tables.consultation_methods`, `tables.lawyers`, `tables.booking_requests`, `tables.booking_reviews`, `tables.legal_cases`, and `tables.lawyer_legal_cases`. Validate submitted currency with `assertSarCurrency()` before inserts/quotes.

- [ ] **Step 4: Convert KSA admin and YourGPT routes**

Admin request lists and provider/case/payment helpers must query only Saudi table identifiers. Remove country selectors from KSA admin query construction; keep central Lawyers.bh multi-country administration outside this app unchanged.

- [ ] **Step 5: Run route and pricing regression tests**

Run: `pnpm --dir apps/lawyers.ksa vitest run app/api/consultation-methods/route.test.ts app/api/available-lawyers/route.test.ts app/api/admin/requests/route.test.ts lib/discounts/pricing.test.ts lib/discounts/service.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit request isolation**

```bash
git add apps/lawyers.ksa/app/api/consultation-methods apps/lawyers.ksa/app/api/available-lawyers apps/lawyers.ksa/app/api/booking-review apps/lawyers.ksa/app/api/lawyers apps/lawyers.ksa/app/api/provider/requests apps/lawyers.ksa/app/api/admin/requests apps/lawyers.ksa/app/api/yourgpt
git commit -m "feat(ksa): route requests through Saudi tables"
```

### Task 5: Saudi-only SOS dispatch, tracking, notifications, and lifecycle

**Files:**
- Create: `apps/lawyers.ksa/app/api/sos/route.test.ts`
- Create: `apps/lawyers.ksa/app/api/sos/lawyer/login/route.test.ts`
- Create: `apps/lawyers.ksa/lib/sos/geo.test.ts`
- Modify: all SOS files listed in the File map.

**Interfaces:**
- Consumes: `getKsaContext()`, `assertKsaInputCountry()`, `assertSarCurrency()`.
- Produces: Saudi SOS catalogue, lawyer authentication/readiness/shifts, matching, emergency creation, status, rating, agreements, live location, arrival/completion, and push/email content in SAR.

- [ ] **Step 1: Write failing SOS isolation tests**

Test invalid `BH` input returns `400 KSA_COUNTRY_REQUIRED`. For valid dispatch, capture SQL and assert it includes `saudi_emergency_requests`, `saudi_consent_log`, `saudi_lawyers`, and `saudi_tap_retailer_onboarding`, with no `bahrain_` identifier. Assert fee payload/notification currency is `SAR`.

For lawyer login/matching, assert queries use `saudi_lawyers` and only Saudi on-shift IDs are candidates.

- [ ] **Step 2: Run SOS tests and confirm failure**

Run: `pnpm --dir apps/lawyers.ksa vitest run app/api/sos/route.test.ts app/api/sos/lawyer/login/route.test.ts lib/sos/geo.test.ts`

Expected: FAIL because current SOS paths contain `BH`, `BHD`, static emergency tables, and Bahrain Tap onboarding.

- [ ] **Step 3: Convert SOS catalogue and creation**

Remove the default country parameter from shifts and case catalogue. Each route must call `getKsaContext()` and use Saudi table identifiers. Rename in-memory fee properties from `baseFeeBhd` to `baseFee` while mapping compatibility columns at the SQL boundary. Emit `currencyCode: "SAR"`.

- [ ] **Step 4: Convert lawyer operations and live location**

Require decoded lawyer tokens to carry `SA`; query/update `saudi_emergency_requests`, `saudi_lawyers`, `saudi_advocate_shifts`, and `saudi_lawyer_push_subscriptions`. Apply the same Saudi constraint to accept, mobilize, arrive, location, complete, status, rating, and agreement routes.

- [ ] **Step 5: Convert notifications and matching**

Matching may only consume lawyer IDs selected from `saudi_lawyers`. Email/push messages use `SAR` and Saudi locale wording. Logs include request ID/operation/`SA` but not precise location history or credentials.

- [ ] **Step 6: Run the complete SOS route suite**

Run: `pnpm --dir apps/lawyers.ksa vitest run app/api/sos lib/sos`

Expected: PASS.

- [ ] **Step 7: Commit SOS isolation**

```bash
git add apps/lawyers.ksa/app/api/sos apps/lawyers.ksa/lib/sos
git commit -m "feat(ksa): isolate Saudi SOS operations"
```

### Task 6: Saudi Tap sessions, callbacks, webhooks, allocations, and refunds

**Files:**
- Create: `apps/lawyers.ksa/app/api/mobile/tap/payment-confirm/route.test.ts`
- Create: `apps/lawyers.ksa/app/api/tap/webhook/route.test.ts`
- Modify: payment/settlement files listed in the File map.

**Interfaces:**
- Consumes: Saudi context/tables, `assertSarCurrency()`, trusted payment metadata containing `{ countryCode: "SA", source, sourceId }`.
- Produces: SAR-only payment creation and Saudi-only confirmation, webhook, commission, allocation, refund, retry, status, and marketplace onboarding updates.

- [ ] **Step 1: Write failing payment isolation tests**

Mock a captured Tap charge with `currency: "SAR"`, trusted Saudi metadata, and the expected amount. Assert confirmation updates `saudi_booking_requests` and Saudi allocations. Add adversarial cases:

```ts
expect(await confirm({ currency: "BHD" })).toMatchObject({ status: 409, error: "KSA_CURRENCY_REQUIRED" });
expect(await confirm({ metadata: { countryCode: "BH" } })).toMatchObject({ status: 409, error: "KSA_PAYMENT_COUNTRY_MISMATCH" });
expect(executedSql.join(" ")).not.toContain("bahrain_");
```

- [ ] **Step 2: Run payment tests and confirm failure**

Run: `pnpm --dir apps/lawyers.ksa vitest run app/api/mobile/tap/payment-confirm/route.test.ts app/api/tap/webhook/route.test.ts lib/tap/mobile-payment-session.test.ts lib/tap/mobile-payment-status.test.ts`

Expected: FAIL because confirmation currently requires `BHD` and directly queries `public.bahrain_booking_requests`.

- [ ] **Step 3: Convert payment creation**

Every session/charge creator loads the Saudi source record, calculates the server-owned amount, sets `currency: "SAR"`, and attaches trusted metadata with `countryCode: "SA"`. Ignore browser amount/currency except for mismatch validation. Test-charge/live-test routes also use SAR and must remain environment-gated.

- [ ] **Step 4: Convert confirmation, status, redirects, and webhooks**

Resolve the source only from signed/provider-returned identifiers and the Saudi context. Verify charge status, amount, currency `SAR`, idempotency, and source ownership before updating `saudi_booking_requests` or `saudi_emergency_requests`. Never select a table from callback query parameters.

- [ ] **Step 5: Convert marketplace onboarding, commission, allocation, refund, and reports**

Read retailer/destination data from `saudi_tap_retailer_onboarding`; write Saudi payment allocations and explicit `SAR` currency. Historical rows are displayed using their stored currency and are not rewritten.

- [ ] **Step 6: Run all Tap/payment tests serially**

Run: `pnpm --dir apps/lawyers.ksa vitest run lib/tap lib/payments app/api/mobile/tap app/api/tap --maxWorkers=1`

Expected: PASS.

- [ ] **Step 7: Commit payment isolation**

```bash
git add apps/lawyers.ksa/app/api/mobile/tap apps/lawyers.ksa/app/api/tap apps/lawyers.ksa/lib/tap apps/lawyers.ksa/lib/payments
git commit -m "feat(ksa): settle Saudi payments in SAR"
```

### Task 7: KSA presentation cleanup and permanent Bahrain-leakage guard

**Files:**
- Create: `apps/lawyers.ksa/test/ksa-static-isolation.test.ts`
- Modify: KSA pages/components containing user-visible `BHD`, Bahrain contact/location/phone assumptions, or country selectors.

**Interfaces:**
- Consumes: `formatSar()` and Saudi country metadata.
- Produces: Saudi-only labels/links/validation and a static regression inventory.

- [ ] **Step 1: Write the static isolation test**

The test recursively scans `app`, `components`, and `lib` TypeScript files and fails on:

```ts
const forbidden = [
  /public\.bahrain_(lawyers|booking_requests|emergency_requests|tap_retailer_onboarding)/,
  /\|\|\s*["']BH["']/,
  /currency\s*:\s*["']BHD["']/,
];
```

Use a small explicit allowlist for migration compatibility adapters and historical-display tests; each allowlisted path includes a one-line reason in the test data.

- [ ] **Step 2: Run the scan and capture the failing inventory**

Run: `pnpm --dir apps/lawyers.ksa vitest run test/ksa-static-isolation.test.ts`

Expected: FAIL and list current Bahrain/BHD leakage paths.

- [ ] **Step 3: Fix user-visible KSA content**

Replace Bahrain locale/date/phone/address defaults with Saudi equivalents (`ar-SA`, `en-SA`, `+966`, Saudi country metadata). Render all prices with `formatSar()`. Remove public country switching from KSA registration/login/request screens. Do not change Lawyers.bh pages.

- [ ] **Step 4: Remove remaining executable Bahrain defaults**

Use the static inventory to convert all remaining runtime paths. Keep only documented compatibility reads required for old records and migration SQL.

- [ ] **Step 5: Run static and UI-adjacent regression tests**

Run: `pnpm --dir apps/lawyers.ksa vitest run test/ksa-static-isolation.test.ts components app/'[locale]'/admin/discount-codes/presentation.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit presentation cleanup**

```bash
git add apps/lawyers.ksa/app apps/lawyers.ksa/components apps/lawyers.ksa/lib apps/lawyers.ksa/test/ksa-static-isolation.test.ts
git commit -m "fix(ksa): remove Bahrain defaults from KSA UI"
```

### Task 8: Full verification, deployment preparation, and release gate

**Files:**
- Modify only files needed to fix failures directly caused by Tasks 1–7.
- Evidence output remains in the task report; credentials and production database URLs are never committed.

**Interfaces:**
- Consumes: complete implementation and migration verifier.
- Produces: verified release candidate; deployment occurs only after explicit approval.

- [ ] **Step 1: Run formatting/diff checks**

Run: `git diff --check origin/DEV...HEAD`

Expected: exit 0.

- [ ] **Step 2: Run the full KSA test suite**

Run: `pnpm --dir apps/lawyers.ksa test -- --maxWorkers=1`

Expected: PASS with zero failed tests.

- [ ] **Step 3: Run lint and TypeScript/build verification**

Run: `pnpm --dir apps/lawyers.ksa lint`

Run: `pnpm --dir apps/lawyers.ksa build:next-only`

Expected: both exit 0.

- [ ] **Step 4: Re-run non-production migration verification**

Run: `DATABASE_URL="$KSA_TEST_DATABASE_URL" pnpm --dir apps/lawyers.ksa db:migrate`

Run: `psql "$KSA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/lawyers.ksa/drizzle/verify_0034_ksa_financial_isolation.sql`

Expected: both exit 0. If the variable is absent, report database verification as not run and block production migration claims.

- [ ] **Step 5: Inspect the final executable leakage inventory**

Run: `rg -n 'public\.bahrain_|\|\|\s*["'"']BH["'"']|currency\s*:\s*["'"']BHD["'"']' apps/lawyers.ksa/app apps/lawyers.ksa/lib apps/lawyers.ksa/components`

Expected: no runtime matches outside the documented historical compatibility allowlist.

- [ ] **Step 6: Prepare the release summary and request approval**

Report separately: focused tests, full tests, lint/build, migration verification, Git commits, remaining allowlisted compatibility paths, and unverified external/payment behavior. Ask for explicit approval before pushing/merging/deploying.

- [ ] **Step 7: After approval, follow the repository release path**

Push the feature commits to DEV, merge DEV into PRODUCTION with the repository-required release identity, push PRODUCTION, deploy the Vercel project whose root is `apps/lawyers.ksa`, and apply migration `0034` through the configured deployment process.

- [ ] **Step 8: Verify the deployed KSA application without a real charge**

Confirm Vercel is `READY`; probe public countries/catalogue endpoints for only `SA`/`SAR`; submit invalid `BH` requests and confirm rejection; verify a test/sandbox registration and request reaches Saudi tables using approved non-production data; verify the payment session contains `SAR` without treating it as a completed charge.

- [ ] **Step 9: Commit any release-only metadata if generated**

```bash
git status --short
```

Expected: clean worktree. If a repository-tracked release metadata file was generated and reviewed, commit it with message `chore(ksa): finalize Saudi release metadata`; otherwise create no extra commit.
