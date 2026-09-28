# Provider Balance Payment Page and PDFs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create Lawyers.bh-hosted provider balance payment links and downloadable invoice and paid-receipt PDFs while keeping Tap webhook confirmation as the payment source of truth.

**Architecture:** The provider link endpoint stores a public Lawyers.bh URL keyed by the existing unique `publicReference`. The existing payment page loads a narrow public balance DTO, while a dedicated payment-initiation endpoint creates Tap charges only after the customer submits. Server-rendered PDF endpoints reuse one focused balance-document renderer and enforce provider session/status rules.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Drizzle/PostgreSQL, Vitest, Tap Charges API, pdf-lib with @pdf-lib/fontkit.

## Global Constraints

- Tap webhook confirmation is the only operation allowed to mark a balance paid and record its immutable allocation.
- Public endpoints expose no phone, email, provider ID, internal database ID, Tap ID, or allocation details.
- Arabic and Persian numerals are normalized before phone validation.
- Country dialing code and currency come from database data; neither is fixed to Bahrain.
- Booking and SOS payment flows must remain behaviorally unchanged.
- Arabic pages render RTL and English pages render LTR.
- Repeated payment submissions and webhook deliveries are idempotent.

---

### Task 1: Provider Balance Domain Contract

**Files:**
- Modify: `lib/payments/provider-balances.ts`
- Modify: `lib/payments/provider-balances.test.ts`

**Interfaces:**
- Produces: `normalizeTapCustomerPhone(phone: string, dialCode: string): { countryCode: string; number: string } | null`
- Produces: `publicBalanceStatus(status: string, dueDate: string | null, now?: Date): ProviderBalancePublicStatus`
- Produces: `canDownloadProviderBalanceReceipt(status: string, tapStatus: string | null): boolean`

- [ ] **Step 1: Write failing normalization and state tests**

```ts
it.each([
  ["٣٦٠٠٥٦٨٢", "+973", { countryCode: "973", number: "36005682" }],
  ["+۹۷۳ ۳۶۰۰۵۶۸۲", "973", { countryCode: "973", number: "36005682" }],
  ["+966 50 123 4567", "+966", { countryCode: "966", number: "501234567" }],
])("normalizes localized phone digits", (phone, dialCode, expected) => {
  expect(normalizeTapCustomerPhone(phone, dialCode)).toEqual(expected);
});

expect(publicBalanceStatus("pending_payment", "2026-09-01", new Date("2026-09-06"))).toBe("expired");
expect(canDownloadProviderBalanceReceipt("paid", "CAPTURED")).toBe(true);
expect(canDownloadProviderBalanceReceipt("pending_payment", "INITIATED")).toBe(false);
```

- [ ] **Step 2: Run the focused test and confirm the new state tests fail**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm vitest run lib/payments/provider-balances.test.ts`

Expected: FAIL because the new public-state functions are not defined.

- [ ] **Step 3: Implement the domain helpers**

Normalize both Arabic digit sets, strip formatting, remove the configured dialing prefix from the local number, compute expired display state without mutating storage, and allow receipts only for `paid` plus `CAPTURED`.

- [ ] **Step 4: Run the focused test**

Expected: all `provider-balances.test.ts` cases pass.

- [ ] **Step 5: Commit the domain contract**

```bash
git add lib/payments/provider-balances.ts lib/payments/provider-balances.test.ts
git commit -m "feat: define public provider balance payment states"
```

### Task 2: Public Balance Details and Lawyers.bh Link

**Files:**
- Create: `lib/payments/provider-balance-public.ts`
- Create: `lib/payments/provider-balance-public.test.ts`
- Create: `app/api/public/provider-balances/[reference]/route.ts`
- Modify: `app/api/provider/balances/[id]/payment-link/route.ts`
- Create: `app/api/provider/balances/[id]/payment-link/route.test.ts`

**Interfaces:**
- Produces: `toPublicProviderBalance(row, now?)` returning only `reference`, `providerName`, `customerName`, `description`, `amount`, `currencyCode`, `dueDate`, `status`, and `paidAt`.
- Produces: `GET /api/public/provider-balances/:reference?locale=ar|en`
- Produces: authenticated `POST /api/provider/balances/:id/payment-link?locale=ar|en` returning `{ ok: true, paymentUrl }` where `paymentUrl` is a Lawyers.bh URL.

- [ ] **Step 1: Write failing public-field filtering tests**

```ts
const result = toPublicProviderBalance(fullDatabaseRow, new Date("2026-09-06"));
expect(result).toEqual(expect.objectContaining({ reference: "BAL-ABC", amount: "12.000" }));
expect(JSON.stringify(result)).not.toContain("customer@example.com");
expect(JSON.stringify(result)).not.toContain("+97336005682");
expect(JSON.stringify(result)).not.toContain("tap_");
```

- [ ] **Step 2: Run the public DTO test and verify it fails**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm vitest run lib/payments/provider-balance-public.test.ts`

Expected: FAIL because `toPublicProviderBalance` does not exist.

- [ ] **Step 3: Implement the DTO and public GET route**

Use a case-insensitive public-reference lookup, select only required columns, return `Cache-Control: no-store`, and return 404 with `BALANCE_NOT_FOUND` for unknown references.

- [ ] **Step 4: Write a failing link-route test**

Assert the route returns `https://www.lawyers.bh/ar/payment?balance=BAL-ABC`, persists that URL, and never calls `createCharge`.

- [ ] **Step 5: Change link generation from Tap to Lawyers.bh**

Build the URL from `siteOrigin(request)`, locale, and `balance.publicReference`. Preserve existing valid links for paid history, set `paymentLinkCreatedAt`, and leave `tapChargeId` untouched.

- [ ] **Step 6: Run both focused route/domain tests**

Expected: all tests pass and the Tap mock has zero calls during link creation.

- [ ] **Step 7: Commit the public link boundary**

```bash
git add lib/payments/provider-balance-public.ts lib/payments/provider-balance-public.test.ts app/api/public/provider-balances app/api/provider/balances/[id]/payment-link
git commit -m "feat: create Lawyers.bh provider payment links"
```

### Task 3: Provider Balance Payment Initiation

**Files:**
- Create: `app/api/public/provider-balances/[reference]/pay/route.ts`
- Create: `app/api/public/provider-balances/[reference]/pay/route.test.ts`
- Modify: `lib/tap.ts`

**Interfaces:**
- Consumes: `normalizeTapCustomerPhone`
- Produces: `POST /api/public/provider-balances/:reference/pay`
- Returns: `{ ok: true, transactionUrl, chargeId, requiresRedirect }` without exposing the secret key or full Tap payload.

- [ ] **Step 1: Write failing initiation tests**

Cover a valid Arabic-digit phone, missing contact, paid/cancelled status, unknown reference, duplicate active charge, and Tap rejection. Assert the payload uses the database country dialing code and balance currency.

- [ ] **Step 2: Run the route test and verify failures**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm vitest run 'app/api/public/provider-balances/[reference]/pay/route.test.ts'`

Expected: FAIL because the route is absent.

- [ ] **Step 3: Implement atomic eligibility and charge creation**

Load the balance and country, allow a linked `pending_payment` balance, reject terminal states, normalize contact data, create the charge with `provider_balance_id`, `provider_id`, and `country_code` metadata, redirect to `/{locale}/payment?balance=...&tap_id=...`, and post to `/api/tap/provider-balance/confirm`. If an active charge is already stored, return `PAYMENT_ALREADY_PROCESSING` rather than creating a second charge.

- [ ] **Step 4: Return stable localized error codes**

Use `BALANCE_NOT_FOUND`, `BALANCE_NOT_PAYABLE`, `CUSTOMER_CONTACT_REQUIRED`, `PAYMENT_ALREADY_PROCESSING`, and `TAP_PAYMENT_UNAVAILABLE`. Log sanitized Tap errors server-side only.

- [ ] **Step 5: Run initiation and Tap client tests**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm vitest run 'app/api/public/provider-balances/[reference]/pay/route.test.ts' lib/tap/client.test.ts`

Expected: all tests pass.

- [ ] **Step 6: Commit payment initiation**

```bash
git add app/api/public/provider-balances/[reference]/pay lib/tap.ts
git commit -m "feat: initiate provider balance payments from site"
```

### Task 4: Existing Payment Page Provider-Balance Mode

**Files:**
- Create: `app/[locale]/payment/providerBalance.ts`
- Create: `app/[locale]/payment/providerBalance.test.ts`
- Modify: `app/[locale]/payment/PaymentContent.tsx`
- Create: `app/[locale]/payment/PaymentContent.test.tsx`

**Interfaces:**
- Consumes: public balance GET and pay endpoints.
- Produces: payment-page states `loading`, `payable`, `pending`, `paid`, `expired`, `cancelled`, `not_found`, and `failed`.

- [ ] **Step 1: Write failing state-mapping tests**

Assert Arabic and English labels for every state and verify the paid state wins even if the return query contains a failure indicator.

- [ ] **Step 2: Run the focused UI helpers test and verify failure**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm vitest run 'app/[locale]/payment/providerBalance.test.ts'`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement provider-balance loading in `PaymentContent`**

When `balance` exists in the URL, fetch the public DTO instead of reading `localStorage`. Display provider, customer, description, reference, due date, amount, and currency using the current payment-page visual system. Keep booking/SOS branches unchanged.

- [ ] **Step 4: Wire payment methods to the public pay endpoint**

Pass card/BenefitPay/Apple Pay source data to the balance endpoint. Redirect only when the server returns a transaction URL. Refresh public status on return and show a retry action for recoverable failure.

- [ ] **Step 5: Run page tests**

Assert RTL/LTR direction, no private fields, payment button disabled during submission, and paid/pending/error rendering.

- [ ] **Step 6: Commit payment-page mode**

```bash
git add 'app/[locale]/payment/PaymentContent.tsx' 'app/[locale]/payment/providerBalance.ts' 'app/[locale]/payment/'*.test.ts*
git commit -m "feat: add provider balances to payment page"
```

### Task 5: Invoice and Paid Receipt PDFs

**Files:**
- Create: `lib/payments/provider-balance-pdf.ts`
- Create: `lib/payments/provider-balance-pdf.test.ts`
- Create: `app/api/provider/balances/[id]/invoice/route.ts`
- Create: `app/api/provider/balances/[id]/receipt/route.ts`
- Create: `app/api/provider/balances/[id]/documents.test.ts`

**Interfaces:**
- Produces: `renderProviderBalancePdf({ kind, locale, balance }): Promise<Uint8Array>` where `kind` is `invoice | receipt`.
- Produces: authenticated invoice and receipt PDF GET endpoints with safe attachment filenames.

- [ ] **Step 1: Write failing PDF eligibility and content tests**

Assert invoice availability for historical states, receipt rejection before `paid/CAPTURED`, correct bilingual title, reference, amount, dates, and absence of phone/email/Tap identifiers in extracted PDF text.

- [ ] **Step 2: Run PDF tests and verify failure**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm vitest run lib/payments/provider-balance-pdf.test.ts 'app/api/provider/balances/[id]/documents.test.ts'`

Expected: FAIL because the renderer and endpoints are absent.

- [ ] **Step 3: Implement the shared PDF renderer**

Use `pdf-lib` and `@pdf-lib/fontkit`, embed the repository Arabic font, apply RTL-safe Arabic text rendering following `lib/sos/pdfRenderer.ts`, and generate A4 documents with Lawyers.bh branding.

- [ ] **Step 4: Implement authenticated document routes**

Require a matching provider session and country. Return invoice PDFs for owned balances, return 409 `RECEIPT_NOT_AVAILABLE` until captured, and set `Content-Type: application/pdf`, attachment disposition, length, and `Cache-Control: no-store`.

- [ ] **Step 5: Render sample PDFs and inspect them visually**

Generate Arabic and English invoice/receipt fixtures, render pages to PNG using Poppler, and verify typography, RTL alignment, clipping, amounts, dates, and paid/cancelled marks.

- [ ] **Step 6: Run PDF tests and commit**

```bash
git add lib/payments/provider-balance-pdf.ts lib/payments/provider-balance-pdf.test.ts app/api/provider/balances/[id]/invoice app/api/provider/balances/[id]/receipt app/api/provider/balances/[id]/documents.test.ts
git commit -m "feat: add provider invoice and receipt PDFs"
```

### Task 6: Provider Dashboard Actions and Accurate Errors

**Files:**
- Modify: `app/[locale]/provider-dashboard/Content.tsx`
- Create: `app/[locale]/provider-dashboard/Content.test.tsx`

**Interfaces:**
- Consumes: link, invoice, receipt, profile, request-list, and balance-list endpoints.
- Produces: localized actions for copy link, download invoice, and download receipt.

- [ ] **Step 1: Write failing dashboard tests**

Assert action visibility per state, copied URL uses Lawyers.bh, receipt appears only when paid, and request-list failure does not show a login message. Assert only a profile 401 displays session-expired copy.

- [ ] **Step 2: Run the dashboard test and verify failures**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm vitest run 'app/[locale]/provider-dashboard/Content.test.tsx'`

Expected: FAIL on missing actions and incorrect error classification.

- [ ] **Step 3: Implement dashboard actions and error boundaries**

Create/copy the site URL, open authenticated invoice/receipt endpoints, disable duplicate button actions while awaiting responses, and show separate localized errors for profile, requests, balances, and payment initiation. Preserve all existing profile and request behavior.

- [ ] **Step 4: Run dashboard and provider-balance tests**

Expected: all focused tests pass.

- [ ] **Step 5: Commit dashboard integration**

```bash
git add 'app/[locale]/provider-dashboard/Content.tsx' 'app/[locale]/provider-dashboard/Content.test.tsx'
git commit -m "feat: expose provider payment documents and site links"
```

### Task 7: End-to-End Verification

**Files:**
- Verify only; modify a failing component only through a new red-green test cycle.

**Interfaces:**
- Consumes all prior tasks.
- Produces release-ready evidence without deploying or mutating production data.

- [ ] **Step 1: Run all focused payment/provider tests**

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm vitest run lib/payments app/api/provider/balances app/api/public/provider-balances 'app/[locale]/payment' 'app/[locale]/provider-dashboard'
```

- [ ] **Step 2: Run type checking and the safe build**

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm exec tsc --noEmit
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm run build:next-only
```

- [ ] **Step 3: Run browser checks in Arabic and English**

Create a local test balance, open the provider dashboard, copy the Lawyers.bh link, verify payment details, exercise a Tap test handoff, return to the site, and download both PDFs. Verify mobile and desktop layouts and RTL/LTR direction.

- [ ] **Step 4: Verify privacy and idempotency**

Inspect public responses for forbidden fields, submit payment twice, replay the confirmation fixture, and confirm one charge/allocation and one paid state.

- [ ] **Step 5: Review the final diff and commit any verification-only test corrections**

```bash
git diff --check
git status --short
```

Do not deploy until the user explicitly approves deployment after reviewing the verified result.
