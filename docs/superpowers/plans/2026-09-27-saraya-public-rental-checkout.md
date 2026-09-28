# Saraya Public Rental Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an anonymous visitor open a public Saraya unit, independently book a management-published viewing slot or start renting immediately, then verify an automatically created or restored tenant account, follow property/unit approval rules, pay, sign the generated lease, and activate the tenancy.

**Architecture:** Extend the existing Saraya public inventory, rental, invoice, payment-demand, lease, document, authorization, and audit modules. Add a viewing-scheduling boundary that transactionally publishes and claims appointment capacity without creating rental requests, a public-onboarding boundary for OTP account verification, a rental checkout orchestrator for approval/payment state transitions, and a public Flutter unit-detail experience with independent visit and rental actions.

**Tech Stack:** Next.js 16 route handlers, TypeScript, Drizzle/PostgreSQL, Tap Payments, Postmark/Saraya SMS webhook, private document storage, PDF-Lib with Cairo fonts, Flutter/Dart, Dio, GoRouter, Vitest, Flutter widget tests.

## Global Constraints

- Property approval mode is `instant` or `owner_review`; a nullable unit override inherits the property value.
- Visit booking and rental application are independent actions; neither requires the other.
- Viewing slots are management-published, capacity-limited, immediately confirmed, and do not change unit rental availability.
- Anonymous visit booking requires name, mobile, email, locale, and an idempotency key; public slot listing never returns appointment contact data.
- Server-side pricing is authoritative; clients never submit payable rent, deposit, fee, or currency values.
- OTP creates or restores a Saraya tenant account before application submission; no anonymous rental request is stored.
- Online payment is confirmed only by authenticated Tap webhook or server-side charge lookup.
- Offline payment remains pending until an authorized accountant, property manager, or super administrator verifies it.
- Confirmed payment creates exactly one lease and signing package; the unit becomes occupied only after all required signatures.
- Public endpoints expose no tenant, owner, identity, contact, payment, document, or contract data.
- All money remains a three-decimal BHD string; do not convert authoritative amounts to floating point.
- All mutations require idempotency keys, property scoping, audit events, and bilingual safe errors.

---

### Task 1: Persist viewing, approval, checkout, payment, and signature state

**Files:**
- Create: `apps/lawyers.bh/drizzle/0122_saraya_public_rental_checkout.sql`
- Create: `apps/lawyers.bh/drizzle/verify_0122_saraya_public_rental_checkout.sql`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Modify: `apps/lawyers.bh/lib/db/saraya-schema.ts`
- Create: `apps/lawyers.bh/lib/saraya/rentals/public-checkout-migration.test.ts`

**Interfaces:**
- Produces tables `saraya_viewing_slots` and `saraya_viewing_appointments` with property-aware foreign keys, transactional capacity, statuses, and idempotency.
- Produces property field `rentalApprovalMode: "instant" | "owner_review"`.
- Produces unit field `rentalApprovalOverride: "instant" | "owner_review" | null`.
- Produces request fields `resolvedApprovalMode`, `applicantType`, `applicantNameAr`, `applicantNameEn`, `registrationNumber`, `leaseId`, and `checkoutExpiresAt`.
- Produces payment evidence fields and table `saraya_lease_signature_requests` with tenant/owner signer rows.

- [ ] **Step 1: Write the failing migration contract test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("drizzle/0122_saraya_public_rental_checkout.sql", "utf8");
const verify = readFileSync("drizzle/verify_0122_saraya_public_rental_checkout.sql", "utf8");
const schema = readFileSync("lib/db/saraya-schema.ts", "utf8");

describe("0121 Saraya public rental checkout", () => {
  it("stores property-scoped viewing slots and private appointments", () => {
    expect(migration).toContain('CREATE TABLE "saraya_viewing_slots"');
    expect(migration).toContain('CREATE TABLE "saraya_viewing_appointments"');
    expect(migration).toContain("saraya_viewing_slots_capacity_check");
    expect(migration).toContain("saraya_viewing_appointments_email_idempotency_uidx");
    expect(verify).toContain("saraya_viewing_appointments_property_slot_fk");
    expect(schema).toContain("sarayaViewingAppointments");
  });

  it("stores inherited approval policy and immutable request snapshots", () => {
    expect(migration).toContain("rental_approval_mode");
    expect(migration).toContain("rental_approval_override");
    expect(migration).toContain("resolved_approval_mode");
    expect(migration).toContain("saraya_rental_requests_active_unit_uidx");
  });

  it("stores payment verification and two-party signatures", () => {
    expect(migration).toContain("payment_method");
    expect(migration).toContain("provider_reference");
    expect(migration).toContain("receipt_document_id");
    expect(migration).toContain("CREATE TABLE \"saraya_lease_signature_requests\"");
    expect(verify).toContain("saraya_lease_signature_requests");
    expect(schema).toContain("sarayaLeaseSignatureRequests");
  });
});
```

- [ ] **Step 2: Run the migration test and verify RED**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh exec vitest run lib/saraya/rentals/public-checkout-migration.test.ts`

Expected: FAIL because migration `0121` and schema fields do not exist.

- [ ] **Step 3: Add the forward-only migration and Drizzle mappings**

Use these exact database values:

```sql
CREATE TABLE saraya_viewing_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  unit_id uuid,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  capacity integer NOT NULL DEFAULT 1,
  booked_count integer NOT NULL DEFAULT 0,
  status varchar(24) NOT NULL DEFAULT 'active',
  instructions_ar text,
  instructions_en text,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saraya_viewing_slots_time_check CHECK (end_at > start_at),
  CONSTRAINT saraya_viewing_slots_capacity_check CHECK (capacity > 0 AND booked_count >= 0 AND booked_count <= capacity),
  CONSTRAINT saraya_viewing_slots_status_check CHECK (status IN ('active', 'disabled', 'cancelled')),
  CONSTRAINT saraya_viewing_slots_property_unit_fk FOREIGN KEY (property_id, unit_id)
    REFERENCES saraya_units(property_id, id) ON DELETE RESTRICT
);

ALTER TABLE saraya_viewing_slots
  ADD CONSTRAINT saraya_viewing_slots_property_id_key UNIQUE (property_id, id);

CREATE TABLE saraya_viewing_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  slot_id uuid NOT NULL,
  user_id uuid,
  reference varchar(32) NOT NULL,
  visitor_name text NOT NULL,
  visitor_phone text NOT NULL,
  visitor_email citext NOT NULL,
  locale varchar(8) NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'confirmed',
  idempotency_key varchar(128) NOT NULL,
  internal_notes text,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saraya_viewing_appointments_status_check CHECK (status IN ('confirmed', 'completed', 'no_show', 'cancelled')),
  CONSTRAINT saraya_viewing_appointments_property_slot_fk FOREIGN KEY (property_id, slot_id)
    REFERENCES saraya_viewing_slots(property_id, id) ON DELETE RESTRICT,
  CONSTRAINT saraya_viewing_appointments_property_unit_fk FOREIGN KEY (property_id, unit_id)
    REFERENCES saraya_units(property_id, id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX saraya_viewing_appointments_email_idempotency_uidx
  ON saraya_viewing_appointments(lower(visitor_email::text), idempotency_key);

ALTER TABLE saraya_properties
  ADD COLUMN rental_approval_mode varchar(24) NOT NULL DEFAULT 'owner_review',
  ADD CONSTRAINT saraya_properties_rental_approval_mode_check
    CHECK (rental_approval_mode IN ('instant', 'owner_review'));

ALTER TABLE saraya_units
  ADD COLUMN rental_approval_override varchar(24),
  ADD CONSTRAINT saraya_units_rental_approval_override_check
    CHECK (rental_approval_override IS NULL OR rental_approval_override IN ('instant', 'owner_review'));

ALTER TABLE saraya_rental_requests
  ADD COLUMN resolved_approval_mode varchar(24) NOT NULL DEFAULT 'owner_review',
  ADD COLUMN applicant_type varchar(16) NOT NULL DEFAULT 'individual',
  ADD COLUMN applicant_name_ar text,
  ADD COLUMN applicant_name_en text,
  ADD COLUMN registration_number text,
  ADD COLUMN lease_id uuid,
  ADD COLUMN checkout_expires_at timestamptz;

CREATE UNIQUE INDEX saraya_rental_requests_active_unit_uidx
  ON saraya_rental_requests(property_id, unit_id)
  WHERE status IN ('pending_owner_review', 'approved_awaiting_payment', 'paid_awaiting_signature');
```

Add indexes for active future slots by property/unit/start time and appointments by property/status/created time. Extend `saraya_payment_demands` with `payment_method`, `provider`, `provider_reference`, `receipt_document_id`, `verified_by_user_id`, `verified_at`, and `failure_code`. Create `saraya_lease_signature_requests` with property/lease/signer role/user/status/token hash/accepted name/IP/user agent/signed timestamp and composite property-scoped foreign keys. Extend the auth challenge purpose check with `public_rental_otp`.

- [ ] **Step 4: Add verification SQL and journal entry**

Add journal entry `idx: 112`, tag `0122_saraya_public_rental_checkout`, and a monotonically greater `when`. Verification must assert all viewing and rental columns, checks, composite foreign keys, idempotency and capacity indexes, the active-unit unique index, and signature indexes.

- [ ] **Step 5: Run focused migration/schema verification**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh exec vitest run lib/saraya/rentals/public-checkout-migration.test.ts lib/saraya/rentals/migration.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/lawyers.bh/drizzle apps/lawyers.bh/lib/db/saraya-schema.ts apps/lawyers.bh/lib/saraya/rentals/public-checkout-migration.test.ts
git commit -m "feat: add Saraya rental checkout schema"
```

---

### Task 2: Publish viewing slots and book appointments safely

**Files:**
- Create: `apps/lawyers.bh/lib/saraya/viewings/contracts.ts`
- Create: `apps/lawyers.bh/lib/saraya/viewings/repository.ts`
- Create: `apps/lawyers.bh/lib/saraya/viewings/service.ts`
- Create: `apps/lawyers.bh/lib/saraya/viewings/service.test.ts`
- Create: `apps/lawyers.bh/lib/saraya/viewings/http.ts`
- Create: `apps/lawyers.bh/lib/saraya/viewings/http.test.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/public/units/[unitId]/viewing-slots/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/public/viewing-appointments/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/viewing-slots/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/viewing-slots/[slotId]/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/viewing-appointments/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/viewing-appointments/[appointmentId]/route.ts`

**Interfaces:**
- Produces `listPublicSlots(unitId, now): Promise<PublicViewingSlot[]>` with no contact or management data.
- Produces `bookPublicAppointment(input): Promise<{ reference: string; status: "confirmed"; startAt: string; endAt: string }>`.
- Produces management methods `createSlot`, `updateSlot`, `listAppointments`, and `updateAppointmentStatus` scoped through `SarayaPrincipal`.
- `bookPublicAppointment` returns the original appointment for the same normalized email and idempotency key.

- [ ] **Step 1: Write failing service tests for public availability and atomic capacity**

```ts
it("returns only active future slots valid for the selected unit", async () => {
  const result = await service.listPublicSlots(unitId, new Date("2026-10-01T08:00:00Z"));
  expect(result).toEqual([
    expect.objectContaining({ id: slotId, remainingCapacity: 1 }),
  ]);
  expect(result[0]).not.toHaveProperty("visitorEmail");
  expect(result[0]).not.toHaveProperty("internalNotes");
});

it("confirms one appointment and never exceeds slot capacity", async () => {
  const result = await service.bookPublicAppointment({
    propertyId,
    unitId,
    slotId,
    visitorName: "Ahmed Ali",
    visitorPhone: "+97339000000",
    visitorEmail: "ahmed@example.com",
    locale: "ar",
    idempotencyKey: "visit-1",
  });
  expect(result).toMatchObject({ status: "confirmed", reference: "SV-000001" });
  expect(repository.claimSlotAndCreateAppointment).toHaveBeenCalledOnce();
});

it("returns a localized conflict when the slot has no capacity", async () => {
  repository.claimSlotAndCreateAppointment.mockRejectedValueOnce(new SlotFullError());
  await expect(service.bookPublicAppointment(validInput)).rejects.toMatchObject({
    status: 409,
    code: "VIEWING_SLOT_FULL",
  });
});
```

- [ ] **Step 2: Run the service tests and verify RED**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh exec vitest run lib/saraya/viewings/service.test.ts`

Expected: FAIL because the viewing module does not exist.

- [ ] **Step 3: Implement the contracts, validation, and transactional repository**

Define these public contracts:

```ts
export interface PublicViewingSlot {
  id: string;
  startAt: string;
  endAt: string;
  remainingCapacity: number;
  instructionsAr: string | null;
  instructionsEn: string | null;
}

export interface PublicAppointmentInput {
  propertyId: string;
  unitId: string;
  slotId: string;
  visitorName: string;
  visitorPhone: string;
  visitorEmail: string;
  locale: "ar" | "en";
  idempotencyKey: string;
}
```

Normalize email to lowercase, trim all contact fields, accept Bahrain or E.164 mobile numbers, reject past slots, and validate UUIDs before repository access. In one SQL transaction, lock the slot `FOR UPDATE`, confirm it is active and valid for the unit, require `booked_count < capacity`, insert the appointment, then increment `booked_count`. Catch the unique idempotency index and return the existing appointment.

- [ ] **Step 4: Write failing HTTP and authorization tests**

```ts
it("allows anonymous slot listing and booking without returning contacts", async () => {
  const list = await handlers.listPublic(new Request(`${base}/public/units/${unitId}/viewing-slots`), { params: Promise.resolve({ unitId }) });
  expect(list.status).toBe(200);
  expect(JSON.stringify(await list.json())).not.toContain("visitorEmail");
});

it("allows only property management to publish slots", async () => {
  await expect(service.createSlot(tenantPrincipal, propertyId, validSlot)).rejects.toMatchObject({ status: 403 });
  await expect(service.createSlot(managerPrincipal, propertyId, validSlot)).resolves.toMatchObject({ status: "active" });
});
```

- [ ] **Step 5: Run HTTP tests and verify RED**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh exec vitest run lib/saraya/viewings/http.test.ts`

Expected: FAIL because routes and handlers do not exist.

- [ ] **Step 6: Implement public and management route handlers**

`GET /public/units/[unitId]/viewing-slots` returns `{ items }`. `POST /public/viewing-appointments` returns status `201` and only reference, status, and scheduled times. Management routes authenticate with `requireSarayaPrincipal`, require `super_admin` or `property_manager`, scope every query by `propertyId`, and support slot create/update plus appointment status `completed | no_show | cancelled`. Cancelling a confirmed appointment decrements capacity exactly once in the same transaction.

- [ ] **Step 7: Run focused backend tests**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh exec vitest run lib/saraya/viewings/service.test.ts lib/saraya/viewings/http.test.ts lib/saraya/access/authorize.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/lawyers.bh/app/api/saraya/v1/public apps/lawyers.bh/app/api/saraya/v1/viewing-* apps/lawyers.bh/lib/saraya/viewings
git commit -m "feat: add Saraya viewing appointments"
```

---

### Task 3: Build unit details, public visit booking, and the management calendar

**Files:**
- Create: `apps/saraya_square_app/lib/features/public_home/domain/public_unit_details.dart`
- Create: `apps/saraya_square_app/lib/features/viewings/domain/viewing_models.dart`
- Create: `apps/saraya_square_app/lib/features/viewings/data/viewing_repository.dart`
- Create: `apps/saraya_square_app/lib/features/viewings/presentation/public_unit_details_screen.dart`
- Create: `apps/saraya_square_app/lib/features/viewings/presentation/viewing_management_screen.dart`
- Create: `apps/saraya_square_app/test/features/viewings/viewing_repository_test.dart`
- Create: `apps/saraya_square_app/test/features/viewings/public_unit_details_screen_test.dart`
- Create: `apps/saraya_square_app/test/features/viewings/viewing_management_screen_test.dart`
- Modify: `apps/saraya_square_app/lib/features/public_home/presentation/public_home_screen.dart`
- Modify: `apps/saraya_square_app/lib/app/router.dart`
- Modify: `apps/saraya_square_app/lib/core/widgets/app_shell.dart`
- Modify: `apps/saraya_square_app/lib/core/localization/app_ar.arb`
- Modify: `apps/saraya_square_app/lib/core/localization/app_en.arb`

**Interfaces:**
- Public unit cards navigate to `/units/:unitId` rather than opening login.
- `ViewingRepository.listPublicSlots(unitId)` and `bookPublicAppointment(input)` are anonymous-safe.
- `PublicUnitDetailsScreen` exposes independent `book-visit` and `rent-now` actions.
- `ViewingManagementScreen` lets management publish slots and mark appointments completed, no-show, or cancelled.

- [ ] **Step 1: Write failing repository and widget tests**

```dart
testWidgets('unit details exposes independent visit and rental actions', (tester) async {
  await tester.pumpWidget(buildDetails());
  await tester.pumpAndSettle();
  expect(find.byKey(const Key('book-visit')), findsOneWidget);
  expect(find.byKey(const Key('rent-now')), findsOneWidget);
});

testWidgets('booking a visit confirms the selected slot without starting rental', (tester) async {
  await tester.pumpWidget(buildDetails(repository: fakeRepository));
  await tester.tap(find.byKey(const Key('book-visit')));
  await tester.pumpAndSettle();
  await tester.tap(find.byKey(const Key('viewing-slot-slot-1')));
  await tester.enterText(find.byKey(const Key('visitor-name')), 'Ahmed Ali');
  await tester.enterText(find.byKey(const Key('visitor-phone')), '+97339000000');
  await tester.enterText(find.byKey(const Key('visitor-email')), 'ahmed@example.com');
  await tester.tap(find.byKey(const Key('confirm-visit')));
  await tester.pumpAndSettle();
  expect(find.text('SV-000001'), findsOneWidget);
  expect(fakeRepository.rentalSubmissions, isEmpty);
});
```

- [ ] **Step 2: Run the Flutter tests and verify RED**

Run: `cd apps/saraya_square_app && flutter test test/features/viewings/viewing_repository_test.dart test/features/viewings/public_unit_details_screen_test.dart test/features/viewings/viewing_management_screen_test.dart`

Expected: FAIL because the feature and routes do not exist.

- [ ] **Step 3: Implement domain models and repositories**

Parse public slots from `{ items: [...] }`, format start/end in the selected locale, and generate a stable client idempotency key once per booking attempt. Parse the booking response into `ViewingAppointmentConfirmation(reference, status, startAt, endAt)`. Management methods use authenticated `/viewing-slots` and `/viewing-appointments` endpoints.

- [ ] **Step 4: Implement responsive unit details and visit booking**

The detail page shows the approved unit fields already present in `PublicUnitListing`, a desktop two-column/mobile single-column layout, and a sticky action area with `Book a visit` and `Rent now`. The visit sheet/dialog loads slots, displays remaining capacity, validates all three contact fields, submits once while disabled, and shows the reference plus scheduled time. `Rent now` navigates to `/units/:unitId/rent`; it never checks for an appointment.

- [ ] **Step 5: Implement management calendar and navigation**

Add `/viewings` inside the authenticated shell for `super_admin` and `property_manager`. Show upcoming slots grouped by date, capacity summaries, appointment rows, add/edit slot dialogs, and status actions. Use `RefreshIndicator` with `AlwaysScrollableScrollPhysics` and preserve the fixed navigation shell.

- [ ] **Step 6: Generate localization files and run focused tests**

Run: `cd apps/saraya_square_app && flutter gen-l10n && flutter test test/features/viewings/viewing_repository_test.dart test/features/viewings/public_unit_details_screen_test.dart test/features/viewings/viewing_management_screen_test.dart test/features/public_home/public_home_screen_test.dart test/app/router_test.dart`

Expected: PASS in Arabic RTL and English LTR test cases.

- [ ] **Step 7: Commit**

```bash
git add apps/saraya_square_app/lib/features/viewings apps/saraya_square_app/lib/features/public_home apps/saraya_square_app/lib/app/router.dart apps/saraya_square_app/lib/core/widgets/app_shell.dart apps/saraya_square_app/lib/core/localization apps/saraya_square_app/test/features/viewings apps/saraya_square_app/test/features/public_home apps/saraya_square_app/test/app/router_test.dart
git commit -m "feat: add Saraya unit visits"
```

---

### Task 4: Verify applicant identity and create or restore the tenant account

**Files:**
- Create: `apps/lawyers.bh/lib/saraya/public-onboarding/contracts.ts`
- Create: `apps/lawyers.bh/lib/saraya/public-onboarding/service.ts`
- Create: `apps/lawyers.bh/lib/saraya/public-onboarding/repository.ts`
- Create: `apps/lawyers.bh/lib/saraya/public-onboarding/delivery.ts`
- Create: `apps/lawyers.bh/lib/saraya/public-onboarding/service.test.ts`
- Create: `apps/lawyers.bh/lib/saraya/public-onboarding/http.test.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/public/onboarding/challenge/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/public/onboarding/verify/route.ts`

**Interfaces:**
- Produces `requestChallenge(input, context): Promise<{ challengeId: string; expiresAt: string }>`.
- Produces `verifyChallenge(input, context): Promise<SessionTokens>` and web HttpOnly session response.
- Uses Postmark for email and `SARAYA_SMS_WEBHOOK_URL` plus `SARAYA_SMS_WEBHOOK_SECRET` for phone.

- [ ] **Step 1: Write failing service tests**

```ts
it("reuses an existing account only after the OTP is valid", async () => {
  const result = await service.verify({
    challengeId: "challenge-1",
    code: "482193",
    displayNameAr: "أحمد علي",
    displayNameEn: "Ahmed Ali",
  });
  expect(result).toMatchObject({ userId: "user-existing", reused: true });
  expect(repository.createUser).not.toHaveBeenCalled();
});

it("creates one account for a verified new identity", async () => {
  const result = await service.verify({
    challengeId: "challenge-2",
    code: "739201",
    displayNameAr: "شركة نور",
    displayNameEn: "Noor Company",
  });
  expect(result).toMatchObject({ userId: "user-new", reused: false });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh exec vitest run lib/saraya/public-onboarding/service.test.ts`

Expected: FAIL because the public-onboarding service does not exist.

- [ ] **Step 3: Implement challenge creation and delivery**

Normalize exactly one identity using existing `validatedEmail` or `validatedPhone`. Generate a six-digit code with `crypto.randomInt(100000, 1000000)`, store only a keyed digest, expire it after ten minutes, and allow five verification attempts. Rate-limit by IP, normalized identity, and challenge ID.

```ts
export interface PublicOnboardingService {
  requestChallenge(input: {
    channel: "email" | "phone";
    identity: string;
    locale: "ar" | "en";
  }, context: RequestContext): Promise<{ challengeId: string; expiresAt: string }>;
  verify(input: {
    challengeId: string;
    code: string;
    displayNameAr: string;
    displayNameEn: string;
  }, context: RequestContext): Promise<{ userId: string; reused: boolean }>;
}
```

- [ ] **Step 4: Implement atomic verification and session creation**

Lock the challenge, compare the digest with timing-safe equality, atomically consume it, find an account by normalized email/phone, or create one with a random unexposed password hash and `isActive=true`. Then create the existing Saraya session. Concurrent verification must have one winner.

- [ ] **Step 5: Add route contract tests and handlers**

Test `202` challenge responses, generic delivery errors, invalid/expired OTP, rate limiting, web cookie session, native token session, and absence of the OTP in responses or logs.

- [ ] **Step 6: Run focused auth/onboarding tests**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh exec vitest run lib/saraya/public-onboarding lib/saraya/auth`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/lawyers.bh/lib/saraya/public-onboarding apps/lawyers.bh/app/api/saraya/v1/public/onboarding
git commit -m "feat: add Saraya public tenant verification"
```

---

### Task 5: Apply approval policy and submit a public rental application

**Files:**
- Modify: `apps/lawyers.bh/lib/saraya/public-inventory/service.ts`
- Modify: `apps/lawyers.bh/lib/saraya/public-inventory/runtime.ts`
- Modify: `apps/lawyers.bh/app/api/saraya/v1/public/home/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/public/units/[unitId]/route.ts`
- Modify: `apps/lawyers.bh/lib/saraya/rentals/contracts.ts`
- Modify: `apps/lawyers.bh/lib/saraya/rentals/service.ts`
- Modify: `apps/lawyers.bh/lib/saraya/rentals/repository.ts`
- Modify: `apps/lawyers.bh/lib/saraya/rentals/http.ts`
- Modify: `apps/lawyers.bh/lib/saraya/rentals/service.test.ts`
- Create: `apps/lawyers.bh/lib/saraya/rentals/public-submit.test.ts`

**Interfaces:**
- Public unit detail returns safe listing terms plus `approvalMode` only.
- Authenticated submit consumes `PublicRentalSubmitInput` and returns either `pending_owner_review` or `approved_awaiting_payment` with invoice/payment-demand identifiers.

- [ ] **Step 1: Write failing policy and submission tests**

```ts
it("inherits instant approval from the property", async () => {
  repository.getAvailableUnit.mockResolvedValue({
    ...offer,
    propertyApprovalMode: "instant",
    unitApprovalOverride: null,
  });
  const result = await service.submit(principal, input);
  expect(result).toMatchObject({
    status: "approved_awaiting_payment",
    resolvedApprovalMode: "instant",
  });
});

it("lets the unit override an instant property with owner review", async () => {
  repository.getAvailableUnit.mockResolvedValue({
    ...offer,
    propertyApprovalMode: "instant",
    unitApprovalOverride: "owner_review",
  });
  await expect(service.submit(principal, input)).resolves.toMatchObject({
    status: "pending_owner_review",
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh exec vitest run lib/saraya/rentals/service.test.ts lib/saraya/rentals/public-submit.test.ts`

Expected: FAIL because offers do not expose approval settings and submit always creates `pending_owner_review`.

- [ ] **Step 3: Extend safe public inventory and detail contracts**

Add these safe fields only:

```ts
type PublicApprovalMode = "instant" | "owner_review";

interface PublicUnitDetail extends PublicUnit {
  depositAmount: string;
  feeAmount: string;
  currency: "BHD";
  approvalMode: PublicApprovalMode;
}
```

Do not include owner IDs, tenant IDs, contact fields, internal documents, payment records, or contract identifiers.

- [ ] **Step 4: Make submit transactional and policy-aware**

Extend `RentalSubmitInput` with applicant type/names/registration number. Resolve `unitApprovalOverride ?? propertyApprovalMode`, snapshot it, lock the unit, enforce the partial unique reservation, and create the request. For `instant`, call the same internal approval/invoice/demand function inside the transaction with an audit actor source of `system` and a null human actor.

- [ ] **Step 5: Preserve manual owner approval**

Keep owner/super-admin authorization, scoped owner matching, mandatory rejection reason, duplicate decision protection, and the existing amount calculation. Property managers may view requests but cannot approve unless explicitly granted by the existing capability model.

- [ ] **Step 6: Run focused rental and public privacy tests**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh exec vitest run lib/saraya/rentals lib/saraya/public-inventory`

Expected: PASS, including a test asserting that public JSON keys do not match `/tenant|owner|email|phone|document|payment|contract/i`.

- [ ] **Step 7: Commit**

```bash
git add apps/lawyers.bh/lib/saraya/public-inventory apps/lawyers.bh/lib/saraya/rentals apps/lawyers.bh/app/api/saraya/v1/public
git commit -m "feat: submit policy-aware Saraya rental requests"
```

---

### Task 6: Support Tap checkout and verified offline payment

**Files:**
- Create: `apps/lawyers.bh/lib/saraya/payments/contracts.ts`
- Create: `apps/lawyers.bh/lib/saraya/payments/service.ts`
- Create: `apps/lawyers.bh/lib/saraya/payments/repository.ts`
- Create: `apps/lawyers.bh/lib/saraya/payments/tap-gateway.ts`
- Create: `apps/lawyers.bh/lib/saraya/payments/service.test.ts`
- Create: `apps/lawyers.bh/lib/saraya/payments/tap-gateway.test.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/rental-requests/[requestId]/payment-session/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/payments/tap/webhook/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/payment-demands/[demandId]/offline-proof/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/payment-demands/[demandId]/decision/route.ts`

**Interfaces:**
- Produces `createOnlineSession(principal, requestId, idempotencyKey)`.
- Produces `recordTapEvent(event)` with replay-safe provider reference handling.
- Produces `submitOfflineProof(principal, demandId, documentId, reference)`.
- Produces `decideOfflinePayment(principal, demandId, decision)`.

- [ ] **Step 1: Write failing payment state tests**

```ts
it("does not mark a demand paid from a browser return", async () => {
  await service.readReturn({ demandId: "demand-1", tapId: "chg_1" });
  expect(repository.markPaid).not.toHaveBeenCalled();
});

it("marks one demand paid after a captured Tap lookup", async () => {
  gateway.retrieveCharge.mockResolvedValue({
    id: "chg_1",
    status: "CAPTURED",
    amount: "550.000",
    currency: "BHD",
    reference: { order: "demand-1" },
  });
  await service.confirmTapCharge("chg_1");
  await service.confirmTapCharge("chg_1");
  expect(repository.markPaid).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh exec vitest run lib/saraya/payments`

Expected: FAIL because the Saraya payment module does not exist.

- [ ] **Step 3: Implement the Tap adapter**

Use `getTapConfig()` and `createTapClient()` from `lib/tap/config.ts` and `lib/tap/client.ts`. Create charges in BHD with three-decimal strings, `reference.order=demandId`, customer details from the authenticated tenant, redirect URL under `/saraya/#/rental-requests/:id`, and post URL `/api/saraya/v1/payments/tap/webhook`. Persist provider reference before returning the URL.

- [ ] **Step 4: Implement server-confirmed online payment**

Webhook processing must retrieve the charge from Tap, compare demand ID, amount, currency, and status, then atomically move demand `pending -> paid`, invoice `due -> paid`, and request `approved_awaiting_payment -> paid_awaiting_signature`. Duplicate events return the existing result.

- [ ] **Step 5: Implement offline proof and decision**

Tenant upload stores a private receipt document and moves demand to `verification_pending`. Only accountant, property manager, or super administrator can approve/reject. Approval performs the same paid transition as Tap; rejection stores `failure_code`, preserves the prior receipt, and permits a replacement proof.

- [ ] **Step 6: Run payment, authorization, and idempotency tests**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh exec vitest run lib/saraya/payments lib/tap/client.test.ts lib/tap/config.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/lawyers.bh/lib/saraya/payments apps/lawyers.bh/app/api/saraya/v1/payments apps/lawyers.bh/app/api/saraya/v1/payment-demands apps/lawyers.bh/app/api/saraya/v1/rental-requests
git commit -m "feat: add Saraya rental payments"
```

---

### Task 7: Create, sign, and activate the lease after payment

**Files:**
- Create: `apps/lawyers.bh/lib/saraya/leases/checkout-service.ts`
- Create: `apps/lawyers.bh/lib/saraya/leases/checkout-repository.ts`
- Create: `apps/lawyers.bh/lib/saraya/leases/contract-renderer.ts`
- Create: `apps/lawyers.bh/lib/saraya/leases/signature-service.ts`
- Create: `apps/lawyers.bh/lib/saraya/leases/checkout-service.test.ts`
- Create: `apps/lawyers.bh/lib/saraya/leases/signature-service.test.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/leases/[id]/signature/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/leases/[id]/document/route.ts`
- Modify: `apps/lawyers.bh/lib/saraya/payments/service.ts`

**Interfaces:**
- Produces `createLeaseForPaidRequest(propertyId, requestId): Promise<{ leaseId: string }>`.
- Produces `signLease(principal, leaseId, input): Promise<SignatureStatus>`.
- Produces private generated draft/final PDF retrieval.

- [ ] **Step 1: Write failing exactly-once lease creation tests**

```ts
it("creates one lease and two signature requests for a paid request", async () => {
  const first = await service.createForPaidRequest("property-1", "request-1");
  const second = await service.createForPaidRequest("property-1", "request-1");
  expect(first.leaseId).toBe(second.leaseId);
  expect(repository.insertLeasePackage).toHaveBeenCalledTimes(1);
  expect(repository.insertSignatureRequests).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({ signerRole: "tenant" }),
      expect.objectContaining({ signerRole: "owner" }),
    ]),
  );
});

it("activates only after tenant and owner signatures", async () => {
  await signatureService.sign(tenantPrincipal, "lease-1", tenantEvidence);
  expect(repository.activateLease).not.toHaveBeenCalled();
  await signatureService.sign(ownerPrincipal, "lease-1", ownerEvidence);
  expect(repository.activateLease).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh exec vitest run lib/saraya/leases/checkout-service.test.ts lib/saraya/leases/signature-service.test.ts`

Expected: FAIL because checkout/signature services do not exist.

- [ ] **Step 3: Implement paid-request lease creation**

In one transaction, lock the paid request, create/reuse the tenant organization and contact/membership, insert lease status `pending_approval`, insert immutable version 1 from the pricing/date snapshot, build the rent schedule with existing `buildRentSchedule`, link `rental_request.lease_id`, and create tenant/owner signature requests. A unique rental-request lease link guarantees idempotency.

- [ ] **Step 4: Render the bilingual lease PDF**

Use `pdf-lib`, `@pdf-lib/fontkit`, and bundled Cairo fonts. Include property/unit, parties, dates, rent schedule, deposit/fees, payment reference, approval audit, signature blocks, document checksum, and generated timestamp. Store draft and final files privately through the existing document storage boundary.

- [ ] **Step 5: Implement authenticated electronic acceptance**

Accept typed legal name plus explicit lease-version checksum confirmation. Record user ID, signer role, timestamp, IP, user agent, and evidence digest. Tenant can sign only their own lease; owner can sign only a unit owned within their property; super administrator can sign as authorized administrator. The second valid signature finalizes the PDF, activates the lease, marks the request `completed`, and marks the unit `occupied` atomically.

- [ ] **Step 6: Run lease, schedule, document, and scope tests**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh exec vitest run lib/saraya/leases lib/saraya/documents`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/lawyers.bh/lib/saraya/leases apps/lawyers.bh/lib/saraya/payments/service.ts apps/lawyers.bh/app/api/saraya/v1/leases
git commit -m "feat: create and sign Saraya rental leases"
```

---

### Task 8: Complete the public Flutter rental application wizard

**Files:**
- Modify: `apps/saraya_square_app/lib/app/router.dart`
- Modify: `apps/saraya_square_app/lib/features/public_home/domain/public_home_inventory.dart`
- Modify: `apps/saraya_square_app/lib/features/public_home/presentation/public_home_screen.dart`
- Create: `apps/saraya_square_app/lib/features/public_rental/domain/public_rental.dart`
- Create: `apps/saraya_square_app/lib/features/public_rental/data/public_rental_repository.dart`
- Create: `apps/saraya_square_app/lib/features/public_rental/presentation/rental_application_wizard.dart`
- Create: `apps/saraya_square_app/lib/features/public_rental/presentation/rental_status_screen.dart`
- Modify: `apps/saraya_square_app/lib/core/localization/app_ar.arb`
- Modify: `apps/saraya_square_app/lib/core/localization/app_en.arb`
- Create: `apps/saraya_square_app/test/features/public_rental/public_rental_repository_test.dart`
- Create: `apps/saraya_square_app/test/features/public_rental/rental_application_wizard_test.dart`
- Modify: `apps/saraya_square_app/test/features/public_home/public_home_screen_test.dart`
- Modify: `apps/saraya_square_app/test/app/router_test.dart`

**Interfaces:**
- Existing public route `/units/:unitId` remains anonymous and its `rent-now` action opens `/units/:unitId/rent`.
- Wizard verifies OTP, adopts the returned session, uploads documents, submits the request, and routes to `/rental-requests/:requestId`.

- [ ] **Step 1: Write failing navigation and mobile wizard tests**

```dart
testWidgets('rent now opens the public application journey without a visit', (tester) async {
  await tester.tap(find.byKey(const Key('rent-now')));
  await tester.pumpAndSettle();
  expect(find.text('طلب استئجار مكتب ١٠١'), findsOneWidget);
  expect(find.byKey(const Key('rental-start')), findsOneWidget);
});

testWidgets('instant approval proceeds to payment after submission', (tester) async {
  await completeApplicantOtpAndDocuments(tester);
  await tester.tap(find.byKey(const Key('rental-submit')));
  await tester.pumpAndSettle();
  expect(find.text('اختر طريقة الدفع'), findsOneWidget);
});
```

- [ ] **Step 2: Run widget tests and verify RED**

Run: `cd apps/saraya_square_app && flutter test test/features/public_home/public_home_screen_test.dart test/features/public_rental/rental_application_wizard_test.dart test/app/router_test.dart`

Expected: FAIL because the rental wizard route and screens do not exist.

- [ ] **Step 3: Add typed repository contracts**

```dart
abstract interface class PublicRentalRepository {
  Future<PublicUnitDetail> loadUnit(String unitId);
  Future<OtpChallenge> requestOtp(OtpRequest input);
  Future<void> verifyOtp(OtpVerification input);
  Future<String> uploadIdentity(RentalDocument input);
  Future<RentalApplication> submit(RentalApplicationInput input);
  Future<PaymentSession> createOnlinePayment(String requestId);
  Future<void> submitOfflineProof(String demandId, RentalDocument proof);
  Future<RentalApplication> status(String requestId);
  Future<void> sign(String leaseId, LeaseSignatureInput input);
}
```

- [ ] **Step 4: Implement responsive unit detail and step wizard**

Extend the Task 3 unit-detail route instead of creating a second unit screen. Use the existing Saraya theme, RTL/LTR localizations, and no invented data. Steps are terms, applicant, OTP, documents, dates, review, then status/payment. Persist non-secret form progress in widget state only; never store OTP, identity file bytes, or payment references in shared preferences.

- [ ] **Step 5: Implement status/payment/signature views**

Render server-provided status codes as bilingual timeline entries. Online payment opens only the API-provided HTTPS URL. Offline payment accepts one private proof and reference. Signature requires typed legal name and explicit acceptance of the displayed lease checksum before submission.

- [ ] **Step 6: Run focused Flutter tests and analysis**

Run: `cd apps/saraya_square_app && flutter gen-l10n && dart format lib test integration_test && flutter analyze && flutter test test/features/public_home test/features/public_rental test/app/router_test.dart --concurrency=1`

Expected: PASS with no overflow at 390 px Arabic and no raw API errors.

- [ ] **Step 7: Commit**

```bash
git add apps/saraya_square_app/lib apps/saraya_square_app/test apps/saraya_square_app/integration_test
git commit -m "feat: add Saraya public rental application flow"
```

---

### Task 9: Add management settings, owner decisions, and offline verification

**Files:**
- Modify: `apps/lawyers.bh/lib/saraya/management/contracts.ts`
- Modify: `apps/lawyers.bh/lib/saraya/management/repository.ts`
- Modify: `apps/lawyers.bh/lib/saraya/rentals/request-list-repository.ts`
- Modify: `apps/lawyers.bh/lib/saraya/rentals/request-list-service.ts`
- Modify: `apps/saraya_square_app/lib/features/management/domain/management_models.dart`
- Modify: `apps/saraya_square_app/lib/features/management/presentation/resource_definition.dart`
- Create: `apps/saraya_square_app/lib/features/rental_requests/data/rental_request_repository.dart`
- Create: `apps/saraya_square_app/lib/features/rental_requests/domain/rental_request.dart`
- Create: `apps/saraya_square_app/lib/features/rental_requests/presentation/rental_requests_screen.dart`
- Modify: `apps/saraya_square_app/lib/core/widgets/app_shell.dart`
- Modify: `apps/saraya_square_app/lib/app/router.dart`
- Modify: `apps/saraya_square_app/lib/core/localization/app_ar.arb`
- Modify: `apps/saraya_square_app/lib/core/localization/app_en.arb`
- Modify: `apps/saraya_square_app/test/features/management/management_screen_test.dart`
- Create: `apps/saraya_square_app/test/features/rental_requests/rental_requests_screen_test.dart`

**Interfaces:**
- Property form edits the default approval mode.
- Unit form edits `inherit`, `instant`, or `owner_review`.
- Rental request queue supports owner approve/reject and authorized offline payment verify/reject.

- [ ] **Step 1: Write failing settings and queue tests**

```dart
testWidgets('unit approval defaults to inherit and can override', (tester) async {
  await openUnitEditor(tester);
  expect(find.text('وراثة إعداد العقار'), findsOneWidget);
  await tester.tap(find.text('موافقة فورية'));
  await tester.tap(find.byKey(const Key('management-save')));
  expect(repository.lastInput.values['rentalApprovalOverride'], 'instant');
});

testWidgets('owner approves only a request for their unit', (tester) async {
  await tester.tap(find.byKey(const Key('approve-request-request-1')));
  await tester.pumpAndSettle();
  expect(repository.approvedRequestId, 'request-1');
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd apps/saraya_square_app && flutter test test/features/management/management_screen_test.dart test/features/rental_requests/rental_requests_screen_test.dart`

Expected: FAIL because settings and queue UI are missing.

- [ ] **Step 3: Extend management API and forms**

Return and accept approval settings only for authorized property/unit writers. Validate enum values server-side. Display the resolved policy read-only in unit rows and the nullable override in the edit form.

- [ ] **Step 4: Implement the scoped queue**

List unit, applicant display name, requested dates, price snapshot, resolved approval mode, payment state, document presence, and timeline. Do not return document bytes in list responses. Use dedicated authorized download actions.

- [ ] **Step 5: Implement owner and finance actions**

Owner/super-admin approve or reject `pending_owner_review`. Accountant/property-manager/super-admin verify offline payments. Every action requires confirmation, idempotency key, localized result, and list refresh without rebuilding the app shell.

- [ ] **Step 6: Run backend and Flutter role tests**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh exec vitest run lib/saraya/management lib/saraya/rentals/request-list-service.test.ts lib/saraya/payments`

Run: `cd apps/saraya_square_app && flutter test test/features/management test/features/rental_requests test/core/widgets/app_shell_test.dart --concurrency=1`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/lawyers.bh/lib/saraya/management apps/lawyers.bh/lib/saraya/rentals apps/saraya_square_app/lib apps/saraya_square_app/test
git commit -m "feat: manage Saraya rental approvals"
```

---

### Task 10: Complete acceptance coverage, publish the web bundle, and release

**Files:**
- Modify: `apps/saraya_square_app/integration_test/phase1_smoke_test.dart`
- Create: `apps/saraya_square_app/integration_test/public_rental_checkout_test.dart`
- Create: `apps/saraya_square_app/integration_test/public_viewing_appointment_test.dart`
- Modify: `apps/lawyers.bh/public/saraya/**` through `tool/publish_web.dart`
- Modify: `apps/saraya_square_app/README.md`

**Interfaces:**
- Produces a verified Flutter web bundle under `/saraya/`.
- Produces release evidence for tests, migrations, Git refs, Vercel READY state, live public routes, and authenticated checkout separately.

- [ ] **Step 1: Add end-to-end acceptance tests with fake boundaries**

Cover anonymous unit opening, independent visit booking and direct rental, capacity conflict, OTP account creation/reuse, instant approval, owner review blocking, Tap server confirmation, offline verification, exactly-one lease, two signatures, unit occupancy, and safe public JSON.

```dart
testWidgets('manual approval blocks payment until the owner approves', (tester) async {
  await completePublicApplication(tester, approvalMode: 'owner_review');
  expect(find.text('بانتظار موافقة المالك'), findsOneWidget);
  expect(find.text('اختر طريقة الدفع'), findsNothing);
  await backend.approveAsOwner();
  await tester.drag(find.byType(Scrollable).first, const Offset(0, 500));
  await tester.pumpAndSettle();
  expect(find.text('اختر طريقة الدفع'), findsOneWidget);
});

testWidgets('visit booking confirms a slot without creating a rental request', (tester) async {
  await openUnitDetails(tester);
  await bookFirstAvailableVisit(tester);
  expect(find.textContaining('SV-'), findsOneWidget);
  expect(backend.rentalRequests, isEmpty);
  expect(backend.appointments, hasLength(1));
});
```

- [ ] **Step 2: Run full backend verification**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh test`

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 3: Apply and verify migration in the configured environment**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --dir apps/lawyers.bh db:migrate`

Run the `verify_0122_saraya_public_rental_checkout.sql` assertions against the same database. Record database integration separately from unit tests.

- [ ] **Step 4: Run full Flutter verification**

Run: `cd apps/saraya_square_app && flutter gen-l10n && flutter analyze && flutter test --concurrency=1`

Expected: PASS.

- [ ] **Step 5: Build and publish the Flutter web bundle**

Run:

```bash
cd apps/saraya_square_app
flutter build web --release --base-href /saraya/ --no-wasm-dry-run
dart run tool/publish_web.dart
```

Verify the bundle contains `/saraya/`, the Saraya build marker, the new public rental routes, and no development API base URL.

- [ ] **Step 6: Commit the generated production bundle and documentation**

```bash
git add apps/lawyers.bh/public/saraya apps/saraya_square_app/integration_test apps/saraya_square_app/README.md
git commit -m "test: verify Saraya public rental checkout"
```

- [ ] **Step 7: Promote DEV to PRODUCTION without force-push**

Fetch and compare `origin/DEV` and `origin/PRODUCTION`, push the completed commits to DEV, merge DEV into a clean PRODUCTION context as `omaralnadeem-max <omaralnadeem@gmail.com>`, push, and verify both remote refs.

- [ ] **Step 8: Deploy with Node 22 and verify live behavior**

Run from the monorepo root:

```bash
PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH \
vercel deploy --prod -y --archive=tgz \
  --scope team_op5rtGhwL8sYleUcpbVtWwv0
```

Wait for `READY`, then verify:

- `GET https://sq.lawyers.bh/saraya` returns the public home without login redirect.
- Public unit detail returns `200` and safe fields only.
- Public viewing slots expose availability without appointment contacts.
- Booking a visit confirms one appointment, respects capacity, and does not create a rental request.
- OTP challenge responses never return the code.
- Instant and manual test units follow their configured approval modes.
- Tap sandbox confirmation and offline verification create exactly one lease each.
- The final signed lease activates the unit only after both signatures.

Do not call a local mock, browser return, or Tap sandbox initiation a successful real payment. Report live gateway, bank settlement, and signing-provider evidence separately.
