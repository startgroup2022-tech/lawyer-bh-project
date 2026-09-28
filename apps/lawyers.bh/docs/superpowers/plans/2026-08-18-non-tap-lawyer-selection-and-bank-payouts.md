# Non-Tap Lawyer Selection and Bank Payouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every approved, unsuspended lawyer selectable before Tap activation, route non-Tap payments through the platform, preserve the lawyer commission as a delayed payable, and expose documented bank settlement plus IBAN documents to administrators.

**Architecture:** Separate service eligibility from Tap payout readiness through pure policy functions used by every discovery and server-side resolution path. Extend the existing payment-allocation ledger rather than creating a competing ledger: `split_mode = 'delayed'` represents a selected-lawyer payment held by the platform, with immutable lawyer/IBAN snapshots and transactional settlement metadata. Reuse the current payouts area for bank settlement and keep office revenue as `platform_only`.

**Tech Stack:** Next.js 16.2 Route Handlers and Server Components, TypeScript, Drizzle ORM, PostgreSQL/Neon, postgres.js raw SQL, Vitest, ESLint, Tap Marketplace.

## Global Constraints

- Service eligibility requires `status = 'approved'`, `is_active = true`, and no active suspension; Tap onboarding is not a selection requirement.
- Tap payout readiness still requires the active environment, onboarding stage `active`, and `payout_enabled = true`.
- All selected-lawyer payments preserve the lawyer ID and use the commission rate effective at capture time.
- A non-Tap selected-lawyer payment is `delayed`, never `platform_only`.
- Commission remains 20% platform / 80% lawyer during the first year and 50% / 50% afterward.
- Bank settlement is manual and requires a reference, transfer date, and administrator identity.
- One captured payment can create at most one allocation and can be settled at most once.
- Migrations are additive and must preserve production data.
- Do not expose IBAN values, Tap secrets, or payment credentials in logs or test output.

---

## File Structure

- `lib/providers/service-eligibility.ts`: pure service-eligibility policy shared by selection and dispatch.
- `lib/providers/service-eligibility.test.ts`: policy truth table.
- `lib/tap/provider-readiness.ts`: payout-readiness policy only; no longer controls visibility.
- `lib/publicLawyers.ts`, `lib/legalCases.ts`: discovery queries based on service eligibility with optional Tap readiness metadata.
- `app/api/tap/charge/route.ts`, `app/api/sos/route.ts`, `app/api/yourgpt/payment-session/route.ts`, `app/api/yourgpt/providers/route.ts`: selected-lawyer resolution and charge routing.
- `lib/payments/allocation-policy.ts`: chooses `provider`, `delayed`, `platform_only`, or `deferred` from assignment and payout readiness.
- `lib/payments/commission.ts`: idempotent booking/emergency allocation recording for all three accounting modes.
- `lib/payments/delayed-settlement.ts`: validates and executes atomic bank/Tap settlement state changes.
- `drizzle/0037_delayed_provider_payables.sql`, `drizzle/verify_0037_delayed_provider_payables.sql`, `drizzle/meta/_journal.json`, `lib/db/schema.ts`: additive ledger fields and constraints.
- `app/api/tap/webhook/route.ts`: captured booking and emergency allocation orchestration.
- `app/api/sos/lawyer/case/[caseRef]/accept/route.ts`: idempotent late allocation for prepaid emergencies assigned after capture.
- `app/[locale]/sos/dispatch/payouts/page.tsx`, `PayoutsView.tsx`, and settlement API routes: payable ledger and manual settlement.
- `app/[locale]/admin/approvals/page.tsx`, `Content.tsx`, and the provider file route: IBAN and optional commercial-registration review.

---

### Task 1: Separate Service Eligibility from Tap Payout Readiness

**Files:**
- Create: `lib/providers/service-eligibility.ts`
- Create: `lib/providers/service-eligibility.test.ts`
- Modify: `lib/tap/provider-readiness.ts`
- Modify: `lib/publicLawyers.ts`
- Modify: `lib/legalCases.ts`
- Modify: `lib/sos/live-dispatch.ts`
- Modify: `lib/sos/live-dispatch.test.ts`
- Modify: `lib/sos/live-dispatch-store.ts`

**Interfaces:**
- Produces: `isProviderServiceEligible(snapshot: ProviderServiceEligibilitySnapshot): boolean`
- Produces: `providerServiceEligibilityCondition(): SQL | undefined`
- Preserves: `isTapProviderReady(snapshot)` for payment routing.

- [ ] **Step 1: Write failing service-eligibility tests**

```ts
const approved = {
  status: "approved",
  isActive: true,
  suspensionType: null,
};

expect(isProviderServiceEligible(approved)).toBe(true);
expect(isProviderServiceEligible({ ...approved, tapReady: false })).toBe(true);
expect(isProviderServiceEligible({ ...approved, status: "pending" })).toBe(false);
expect(isProviderServiceEligible({ ...approved, isActive: false })).toBe(false);
expect(isProviderServiceEligible({ ...approved, suspensionType: "temporary" })).toBe(false);
```

- [ ] **Step 2: Run the policy and dispatch tests to verify RED**

Run: `pnpm exec vitest run lib/providers/service-eligibility.test.ts lib/sos/live-dispatch.test.ts`

Expected: FAIL because the service policy does not exist and dispatch rejects `providerReady: false`.

- [ ] **Step 3: Implement the pure policy and Drizzle condition**

```ts
export type ProviderServiceEligibilitySnapshot = {
  status: string | null;
  isActive: boolean;
  suspensionType: string | null;
};

export function isProviderServiceEligible(input: ProviderServiceEligibilitySnapshot) {
  return input.status === "approved" && input.isActive && !input.suspensionType;
}

export function providerServiceEligibilityCondition() {
  return and(
    eq(schema.bahrainLawyers.status, "approved"),
    eq(schema.bahrainLawyers.isActive, true),
    isNull(schema.bahrainLawyers.suspensionType),
  );
}
```

- [ ] **Step 4: Replace Tap joins used only for visibility**

Remove the mandatory Tap inner join from `getPublicLawyers` and legal-case provider discovery. Keep an optional left join only where the response needs payout-readiness metadata. In live dispatch, replace `providerReady` as an eligibility gate with approved/active/unsuspended checks; retain payout readiness on the candidate for later accounting decisions.

- [ ] **Step 5: Run focused tests and static checks**

Run: `pnpm exec vitest run lib/providers/service-eligibility.test.ts lib/tap/provider-readiness.test.ts lib/sos/live-dispatch.test.ts`

Run: `pnpm exec tsc --noEmit --incremental false`

Run: `pnpm exec eslint lib/providers/service-eligibility.ts lib/providers/service-eligibility.test.ts lib/publicLawyers.ts lib/legalCases.ts lib/sos/live-dispatch.ts lib/sos/live-dispatch-store.ts`

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/lawyers.bh/lib/providers apps/lawyers.bh/lib/tap/provider-readiness.ts apps/lawyers.bh/lib/publicLawyers.ts apps/lawyers.bh/lib/legalCases.ts apps/lawyers.bh/lib/sos/live-dispatch.ts apps/lawyers.bh/lib/sos/live-dispatch.test.ts apps/lawyers.bh/lib/sos/live-dispatch-store.ts
git commit -m "feat: separate lawyer eligibility from Tap readiness"
```

---

### Task 2: Activate Lawyers Immediately After Administrative Approval

**Files:**
- Modify: `lib/tap/admin-approval.ts`
- Modify: `lib/tap/admin-approval.test.ts`
- Modify: `app/api/admin/provider-applications/[id]/approve/route.ts`
- Modify: `app/api/tap/marketplace/webhook/route.ts`

**Interfaces:**
- Changes: approval returns an active provider before Tap onboarding completes.
- Preserves: webhook updates Tap onboarding state without deactivating an approved lawyer when payout is pending.

- [ ] **Step 1: Write failing approval and webhook policy tests**

```ts
expect(await finalizeTapAdminApproval(deps)).toMatchObject({
  provider: { status: "approved", isActive: true },
  tapOnboarding: { stage: "pending_admin" },
});

expect(providerActivationForMarketplaceUpdate({
  providerStatus: "approved",
  payoutEnabled: false,
})).toEqual({ isActive: true });
```

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm exec vitest run lib/tap/admin-approval.test.ts lib/tap/provider-activation.test.ts`

Expected: FAIL because approval currently writes `isActive: false` and the webhook mirrors payout readiness into `isActive`.

- [ ] **Step 3: Implement immediate activation**

In the approval route set `status: "approved"` and `isActive: true`. Keep onboarding creation and scheduling unchanged. In the Marketplace webhook, never set an approved provider inactive merely because payout is pending; suspension routes remain responsible for deactivation.

- [ ] **Step 4: Preserve approval repair idempotency**

Update `canRepairTapApproval` to allow an approved provider missing commission/onboarding state without requiring `isActive = false`. Ensure the advisory lock and existing onboarding lookup still prevent duplicate work.

- [ ] **Step 5: Verify and commit**

Run: `pnpm exec vitest run lib/tap/admin-approval.test.ts lib/tap/provider-activation.test.ts`

Run: `pnpm exec tsc --noEmit --incremental false`

Run: `pnpm exec eslint lib/tap/admin-approval.ts app/api/admin/provider-applications/[id]/approve/route.ts app/api/tap/marketplace/webhook/route.ts`

```bash
git add apps/lawyers.bh/lib/tap/admin-approval.ts apps/lawyers.bh/lib/tap/admin-approval.test.ts apps/lawyers.bh/app/api/admin/provider-applications/[id]/approve/route.ts apps/lawyers.bh/app/api/tap/marketplace/webhook/route.ts
git commit -m "feat: activate lawyers independently of Tap"
```

---

### Task 3: Add Delayed Settlement Fields to the Allocation Ledger

**Files:**
- Create: `drizzle/0037_delayed_provider_payables.sql`
- Create: `drizzle/verify_0037_delayed_provider_payables.sql`
- Create: `scripts/verify-delayed-provider-payables.mjs`
- Modify: `drizzle/meta/_journal.json`
- Modify: `test/drizzle-journal.test.ts`
- Modify: `lib/db/schema.ts`

**Interfaces:**
- Extends `bahrain_payment_allocations` and every provisioned country allocation table.
- Adds immutable snapshots and settlement metadata without changing historical rows.

- [ ] **Step 1: Add a failing migration-journal test**

The Vitest test requires `0037_delayed_provider_payables` as the final journal tag and verifies the journal entry is unique. The verification script connects only to the explicit `TEST_DATABASE_URL`, creates uniquely named fixture allocation tables inside a transaction, applies the migration logic, asserts columns/checks/indexes through `information_schema` and `pg_catalog`, and rolls the transaction back. It must refuse to run if the database name does not end in `_test`.

- [ ] **Step 2: Run the journal test to verify RED**

Run: `pnpm exec vitest run test/drizzle-journal.test.ts`

Run: `TEST_DATABASE_URL=postgres://lawyers:lawyers_dev_password@localhost:5433/lawyers_bh_test node scripts/verify-delayed-provider-payables.mjs`

Expected: FAIL because migration `0037` does not exist.

- [ ] **Step 3: Add ledger columns and constraints**

For each provisioned `<prefix>_payment_allocations` table add:

```sql
provider_name_snapshot text,
provider_iban_snapshot text,
settlement_status text NOT NULL DEFAULT 'not_applicable',
settlement_method text,
settlement_reference text,
settlement_transferred_at timestamptz,
settlement_recorded_at timestamptz,
settlement_recorded_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
reconciliation_error text
```

Add checks:

```sql
settlement_status IN ('not_applicable','bank_pending','processing','paid_bank','paid_tap','failed','cancelled')
```

and require reference/date/admin for `paid_bank` and `paid_tap`. Add an index on `(settlement_status, captured_at)`; existing unique Tap charge and request indexes remain the duplicate-liability boundary.

- [ ] **Step 4: Update Drizzle schema types**

Add matching fields to `paymentAllocations`. Keep `splitMode` values `legacy | platform_only | instant | delayed`; use `delayed` for platform-held lawyer funds.

- [ ] **Step 5: Add verification SQL**

The verification script must raise an exception if any provisioned allocation table lacks the new columns, check constraints, or settlement index.

- [ ] **Step 6: Verify and commit**

Run: `pnpm exec vitest run test/drizzle-journal.test.ts`

Run: `pnpm exec tsc --noEmit --incremental false`

Run: `git diff --check`

```bash
git add apps/lawyers.bh/drizzle/0037_delayed_provider_payables.sql apps/lawyers.bh/drizzle/verify_0037_delayed_provider_payables.sql apps/lawyers.bh/drizzle/meta/_journal.json apps/lawyers.bh/test/drizzle-journal.test.ts apps/lawyers.bh/lib/db/schema.ts
git commit -m "feat: add delayed provider settlement ledger"
```

---

### Task 4: Route Selected-Lawyer Charges by Payout Readiness

**Files:**
- Modify: `lib/payments/allocation-policy.ts`
- Modify: `lib/payments/allocation-policy.test.ts`
- Modify: `app/api/tap/charge/route.ts`
- Modify: `app/api/sos/route.ts`
- Modify: `app/api/yourgpt/payment-session/route.ts`
- Modify: `app/api/yourgpt/providers/route.ts`
- Create: `lib/payments/charge-routing.ts`
- Create: `lib/payments/charge-routing.test.ts`

**Interfaces:**
- Produces: `getBookingAllocationMode({ assignmentMode, providerId, payoutReady }): "provider" | "delayed" | "platform_only" | "deferred"`
- Produces: `getChargeRecipient({ assignmentMode, providerId, payoutReady, destinationId }): { mode: "platform" | "provider"; destinationId: string | null; allocationMode: BookingAllocationMode }`
- Selected-lawyer resolvers return `{ id, name, email, ibanNumber, payoutReady, destinationId }`.

- [ ] **Step 1: Write failing allocation-policy tests**

```ts
expect(getBookingAllocationMode({
  assignmentMode: "lawyer",
  providerId: LAWYER_ID,
  payoutReady: false,
})).toBe("delayed");

expect(getBookingAllocationMode({
  assignmentMode: "lawyer",
  providerId: LAWYER_ID,
  payoutReady: true,
})).toBe("provider");
```

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm exec vitest run lib/payments/allocation-policy.test.ts`

Expected: FAIL because payout readiness is not an input and every selected lawyer is classified as provider mode.

- [ ] **Step 3: Implement the four-way allocation policy**

```ts
if (providerId && payoutReady) return "provider";
if (providerId) return "delayed";
if (assignmentMode === "office") return "platform_only";
return "deferred";
```

- [ ] **Step 4: Decouple resolver eligibility from Tap joins**

Each resolver selects approved/active/unsuspended lawyers without an inner Tap requirement, then left joins the environment-specific onboarding row to derive `payoutReady`. Name lookup and UUID lookup must apply identical eligibility conditions.

- [ ] **Step 5: Route the charge payload**

Implement `getChargeRecipient` in `lib/payments/charge-routing.ts`. For Tap-ready lawyers it returns the existing provider destination. For non-ready lawyers it returns `{ mode: "platform", destinationId: null, allocationMode: "delayed" }`; route payload builders omit destination/provider split fields but retain selected lawyer ID/name and delayed allocation metadata.

- [ ] **Step 6: Verify all entry points**

Run: `pnpm exec vitest run lib/payments/allocation-policy.test.ts lib/tap/provider-readiness.test.ts`

Run: `pnpm exec vitest run lib/payments/allocation-policy.test.ts lib/payments/charge-routing.test.ts lib/tap/provider-readiness.test.ts`

Run: `pnpm exec tsc --noEmit --incremental false`

Run: `pnpm exec eslint app/api/tap/charge/route.ts app/api/sos/route.ts app/api/yourgpt/payment-session/route.ts app/api/yourgpt/providers/route.ts lib/payments/allocation-policy.ts`

- [ ] **Step 7: Commit**

```bash
git add apps/lawyers.bh/lib/payments/allocation-policy.ts apps/lawyers.bh/lib/payments/allocation-policy.test.ts apps/lawyers.bh/lib/payments/charge-routing.ts apps/lawyers.bh/lib/payments/charge-routing.test.ts apps/lawyers.bh/app/api/tap/charge/route.ts apps/lawyers.bh/app/api/sos/route.ts apps/lawyers.bh/app/api/yourgpt/payment-session/route.ts apps/lawyers.bh/app/api/yourgpt/providers/route.ts
git commit -m "feat: route non-Tap lawyer charges to platform"
```

---

### Task 5: Record Idempotent Booking and Emergency Delayed Allocations

**Files:**
- Modify: `lib/payments/commission.ts`
- Modify: `lib/payments/commission-sql.test.ts`
- Create: `lib/payments/delayed-allocation.test.ts`
- Modify: `app/api/tap/webhook/route.ts`
- Modify: `app/api/sos/lawyer/case/[caseRef]/accept/route.ts`

**Interfaces:**
- Changes `recordPaymentAllocation` to consume:

```ts
type PaymentRequestRef =
  | { kind: "booking"; id: string }
  | { kind: "emergency"; id: string };

type AllocationMode = "provider" | "delayed" | "platform_only";
```

- Delayed mode additionally consumes `providerId`, `providerNameSnapshot`, and `providerIbanSnapshot`.

- [ ] **Step 1: Write failing delayed-allocation tests**

Cover exact 20/80 calculations, `split_mode = delayed`, `settlement_status = bank_pending`, IBAN/name snapshots, emergency request identity, and a duplicate Tap charge returning the existing allocation without a second insert.

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm exec vitest run lib/payments/delayed-allocation.test.ts lib/payments/commission-sql.test.ts`

Expected: FAIL because delayed mode and emergency request references are unsupported.

- [ ] **Step 3: Generalize allocation recording**

Bind exactly one of `booking_request_id` or `emergency_request_id`. Provider and delayed modes resolve the effective commission; platform-only mode remains 100/0. Delayed mode stores provider identity, snapshots, `payout_status = pending`, and `settlement_status = bank_pending`. Serialize every raw-SQL `Date` with `toSqlTimestamp` and cast it to `timestamptz`.

- [ ] **Step 4: Integrate captured booking payments**

The webhook loads the selected lawyer's current payout readiness and IBAN, calls the four-way allocation policy, and records provider, delayed, or platform-only allocation. If the booking is paid but allocation fails, persist `reconciliation_error` where possible and log only request/charge IDs.

- [ ] **Step 5: Integrate emergency payments**

If a captured emergency already has `assigned_lawyer_id`, record its allocation immediately. If it is prepaid before live dispatch assignment, leave allocation deferred; the lawyer acceptance route creates the allocation idempotently from the captured charge and stored gross amount as part of assignment finalization.

- [ ] **Step 6: Verify and commit**

Run: `pnpm exec vitest run lib/payments/delayed-allocation.test.ts lib/payments/commission-sql.test.ts lib/payments/allocation-policy.test.ts`

Run: `pnpm exec tsc --noEmit --incremental false`

Run: `pnpm exec eslint lib/payments/commission.ts app/api/tap/webhook/route.ts app/api/sos/lawyer/case/[caseRef]/accept/route.ts`

```bash
git add apps/lawyers.bh/lib/payments apps/lawyers.bh/app/api/tap/webhook/route.ts apps/lawyers.bh/app/api/sos/lawyer/case/[caseRef]/accept/route.ts
git commit -m "feat: record delayed lawyer allocations"
```

---

### Task 6: Add Transactional Manual Settlement

**Files:**
- Create: `lib/payments/delayed-settlement.ts`
- Create: `lib/payments/delayed-settlement.test.ts`
- Create: `app/api/admin/provider-payables/[id]/settle/route.ts`
- Create: `app/api/admin/provider-payables/[id]/settle/route.test.ts`

**Interfaces:**
- Produces:

```ts
type SettlementInput = {
  allocationId: string;
  method: "bank" | "tap";
  reference: string;
  transferredAt: Date;
  adminId: string;
};

settleDelayedAllocation(input: SettlementInput): Promise<SettledAllocation>;

type SettledAllocation = {
  id: string;
  settlementStatus: "paid_bank" | "paid_tap";
  settlementReference: string;
  settlementTransferredAt: string;
  settlementRecordedBy: string;
};
```

- [ ] **Step 1: Write failing validation and transition tests**

Test empty reference, invalid date, missing IBAN for bank, successful `bank_pending -> paid_bank`, successful unpaid `bank_pending -> paid_tap` with a confirmed external Tap reference, and conflicts for every already-paid state.

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm exec vitest run lib/payments/delayed-settlement.test.ts app/api/admin/provider-payables/[id]/settle/route.test.ts`

Expected: FAIL because the service and route do not exist.

- [ ] **Step 3: Implement atomic settlement**

Use one conditional update through the country table name resolved by `buildCountryTableSet`:

```ts
await sqlClient`
  UPDATE ${sqlClient(tables.payment_allocations)}
  SET settlement_status = ${paidStatus},
      settlement_method = ${input.method},
      settlement_reference = ${input.reference},
      settlement_transferred_at = ${toSqlTimestamp(input.transferredAt)}::timestamptz,
      settlement_recorded_at = NOW(),
      settlement_recorded_by = ${input.adminId}::uuid,
      payout_status = 'paid',
      paid_out_at = NOW(),
      updated_at = NOW()
  WHERE id = ${input.allocationId}::uuid
    AND split_mode = 'delayed'
    AND settlement_status IN ('bank_pending','failed')
  RETURNING id, settlement_status, settlement_reference,
            settlement_transferred_at, settlement_recorded_by
`;
```

Return 409 when no row is updated because another administrator or process already settled it. Bank settlement additionally requires a nonempty IBAN snapshot.

- [ ] **Step 4: Protect the route**

Require an active administrator with `manage_finance`, parse `method`, `reference`, and ISO `transferredAt`, and return 400 for validation, 404 for missing allocation, and 409 for stale settlement state.

- [ ] **Step 5: Verify and commit**

Run: `pnpm exec vitest run lib/payments/delayed-settlement.test.ts app/api/admin/provider-payables/[id]/settle/route.test.ts`

Run: `pnpm exec tsc --noEmit --incremental false`

Run: `pnpm exec eslint lib/payments/delayed-settlement.ts app/api/admin/provider-payables/[id]/settle/route.ts`

```bash
git add apps/lawyers.bh/lib/payments/delayed-settlement.ts apps/lawyers.bh/lib/payments/delayed-settlement.test.ts apps/lawyers.bh/app/api/admin/provider-payables
git commit -m "feat: record manual lawyer settlements"
```

---

### Task 7: Show IBAN and Commercial Registration in Approvals

**Files:**
- Modify: `app/[locale]/admin/approvals/page.tsx`
- Modify: `app/[locale]/admin/approvals/Content.tsx`
- Modify: `app/api/admin/provider-applications/[id]/file/[kind]/route.ts`
- Modify: `app/api/admin/provider-applications/[id]/file/[kind]/route.test.ts`

**Interfaces:**
- Approval row adds `ibanNumber`, `ibanCertificateFileName`, `crNumber`, and `institutionLicenseFileName`.
- File kinds become `profile | license | iban | institution`.

- [ ] **Step 1: Add failing file-route tests**

Extend the existing table test with Blob-backed and legacy Base64 cases for `iban` and `institution`, plus 404 for an absent optional institution file.

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm exec vitest run app/api/admin/provider-applications/[id]/file/[kind]/route.test.ts`

Expected: FAIL because only `profile` and `license` are accepted.

- [ ] **Step 3: Extend the file route**

Select IBAN certificate and institution file name, MIME type, Base64 where available, and Blob URL. Resolve the chosen fields from a typed kind map, redirect valid HTTP(S) Blob URLs, otherwise return the legacy buffer.

- [ ] **Step 4: Extend the approvals query and UI**

Display the full IBAN and link to `/file/iban`. Display the CR number and `/file/institution` link only when present; otherwise show the localized equivalent of “Not provided”. Do not make CR fields required.

- [ ] **Step 5: Verify and commit**

Run: `pnpm exec vitest run app/api/admin/provider-applications/[id]/file/[kind]/route.test.ts`

Run: `pnpm exec tsc --noEmit --incremental false`

Run: `pnpm exec eslint app/[locale]/admin/approvals/page.tsx app/[locale]/admin/approvals/Content.tsx app/api/admin/provider-applications/[id]/file/[kind]/route.ts`

```bash
git add apps/lawyers.bh/app/[locale]/admin/approvals apps/lawyers.bh/app/api/admin/provider-applications/[id]/file/[kind]
git commit -m "feat: show lawyer banking documents in approvals"
```

---

### Task 8: Replace Aggregate Emergency Payout Actions with the Delayed Ledger

**Files:**
- Modify: `app/[locale]/sos/dispatch/payouts/page.tsx`
- Modify: `app/[locale]/sos/dispatch/payouts/PayoutsView.tsx`
- Create: `app/[locale]/sos/dispatch/payouts/presentation.ts`
- Create: `app/[locale]/sos/dispatch/payouts/presentation.test.ts`
- Modify: `app/api/sos/dispatch/payouts/export/route.ts`

**Interfaces:**
- Page consumes delayed allocation rows rather than recomputing a fixed emergency cut.
- UI settlement action calls `/api/admin/provider-payables/[id]/settle` with `{ method, reference, transferredAt }`.

- [ ] **Step 1: Write failing presentation tests**

Test Arabic/English status labels, exact three-decimal BHD formatting, missing-IBAN blocking state, and settled reference/date rendering from literal allocation fixtures.

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm exec vitest run app/[locale]/sos/dispatch/payouts/presentation.test.ts`

Expected: FAIL because the presentation module does not exist.

- [ ] **Step 3: Query the delayed allocation ledger**

Select lawyer/member snapshot, IBAN snapshot, booking or emergency request identity, capture date, gross/platform/provider percentages and amounts, settlement status, method, reference, transferred date, and recording administrator. Totals must sum stored amounts, never recalculate using one global cut percentage.

- [ ] **Step 4: Build the settlement UI**

Replace bulk settle/unsettle buttons with per-payable settlement. The modal requires method, reference, and transfer date; bank is disabled when the IBAN snapshot is empty. Show status pills for pending, processing, paid bank, paid Tap, failed, and cancelled.

- [ ] **Step 5: Update CSV export**

Export the same immutable ledger fields and omit secrets other than the authorized IBAN value required for operations.

- [ ] **Step 6: Verify and commit**

Run: `pnpm exec vitest run app/[locale]/sos/dispatch/payouts/presentation.test.ts lib/payments/delayed-settlement.test.ts`

Run: `pnpm exec tsc --noEmit --incremental false`

Run: `pnpm exec eslint app/[locale]/sos/dispatch/payouts app/api/sos/dispatch/payouts/export/route.ts`

```bash
git add apps/lawyers.bh/app/[locale]/sos/dispatch/payouts apps/lawyers.bh/app/api/sos/dispatch/payouts/export/route.ts
git commit -m "feat: add delayed lawyer payout dashboard"
```

---

### Task 9: Full Verification and Production-Safe Handoff

**Files:**
- Modify only files required to fix failures caused by Tasks 1–8; do not repair unrelated historical failures.

- [ ] **Step 1: Run the focused feature suite**

Run all new and touched tests in one Vitest command. Expected: zero failed tests.

- [ ] **Step 2: Run TypeScript and lint**

Run: `pnpm exec tsc --noEmit --incremental false`

Run ESLint on every changed `.ts` and `.tsx` file. Expected: exit 0.

- [ ] **Step 3: Validate migration artifacts**

Run: `pnpm exec vitest run test/drizzle-journal.test.ts`

Run: `git diff --check`

Do not execute the migration against production from a developer shell.

- [ ] **Step 4: Run the Next-only production build**

Run: `pnpm run build:next-only`

Expected: Next.js compilation and TypeScript succeed. If page-data collection hits an unrelated existing invalid environment URL, report it separately and do not misstate the feature as fully built.

- [ ] **Step 5: Review financial invariants**

Confirm from tests and diff that office payments remain 100% platform, selected non-Tap payments retain a provider and delayed liability, stored percentages sum to 100, one Tap charge maps to one allocation, and paid states cannot transition twice.

- [ ] **Step 6: Commit verification-only adjustments**

If Step 1–5 reveals a feature-scoped defect, return to that task's failing test, apply the smallest correction, rerun that task's checks, and commit only those named task files with `git commit -m "fix: verify delayed lawyer settlements"`. If no defect is found, do not create an empty verification commit.

- [ ] **Step 7: Stop before deployment**

Report commit hashes, test/build evidence, migration scope, and any unrelated failures. Obtain explicit approval before pushing, merging to `PRODUCTION`, or allowing Vercel to apply migration `0037`.
