# Saraya Admin Operational CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete real create, update, state-transition and archive workflows for virtual addresses, meeting rooms/bookings, maintenance tickets and documents in the Saraya Square administration interface.

**Architecture:** Extend each existing feature through the same domain → repository → service/API → Flutter repository → responsive screen pattern already used by the project. Every mutation is property-scoped, role-authorized, validated on the server, recorded in the audit timeline, and exposed only when valid for the current record state.

**Tech Stack:** Next.js route handlers, TypeScript, Drizzle/PostgreSQL, Vitest, Flutter/Dart, Dio, GoRouter, Flutter widget tests.

## Global Constraints

- Preserve the current uncommitted work and existing naming/architecture.
- Do not commit, push or deploy publicly unless the user explicitly requests it.
- Arabic RTL and English LTR are acceptance criteria.
- Desktop uses tables and side sheets; mobile uses cards and full-height sheets.
- Do not show an action unless a real authorized API operation exists.
- Every mutation writes an audit event containing actor, property, entity, operation, previous state and next state.
- Use test-driven development for every behavior change.

---

### Task 1: Shared Audit Events

**Files:**
- Create: `apps/lawyers.bh/drizzle/0118_saraya_audit_events.sql`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Modify: `apps/lawyers.bh/lib/db/saraya-schema.ts`
- Create: `apps/lawyers.bh/lib/saraya/audit/repository.ts`
- Create: `apps/lawyers.bh/lib/saraya/audit/repository.test.ts`

**Interfaces:**
- Produces: `recordAuditEvent(tx, { propertyId, actorUserId, entityType, entityId, operation, before, after })`.

- [ ] **Step 1: Write the failing migration and repository tests**

```ts
expect(migration).toContain('CREATE TABLE "saraya_audit_events"');
await recordAuditEvent(transaction, {
  propertyId,
  actorUserId,
  entityType: "maintenance_ticket",
  entityId,
  operation: "update",
  before: { status: "open" },
  after: { status: "assigned" },
});
expect(inserted.operation).toBe("update");
```

- [ ] **Step 2: Run tests and verify failure because the table and writer do not exist**

Run: `pnpm vitest run lib/saraya/audit/repository.test.ts`

- [ ] **Step 3: Implement the append-only audit table and transaction-aware writer**

The table columns are `id`, `property_id`, `actor_user_id`, `entity_type`, `entity_id`, `operation`, `before_state`, `after_state`, and `created_at`. No update or delete API is added.

- [ ] **Step 4: Run focused tests and the migration locally**

Run: `pnpm vitest run lib/saraya/audit/repository.test.ts && DATABASE_URL=postgresql://lawyers:lawyers_dev_password@127.0.0.1:5433/lawyers_bh pnpm db:migrate`

---

### Task 2: Virtual Address Mutations

**Files:**
- Modify: `apps/lawyers.bh/lib/saraya/virtual-addresses/service.ts`
- Modify: `apps/lawyers.bh/lib/saraya/virtual-addresses/repository.ts`
- Modify: `apps/lawyers.bh/app/api/saraya/v1/virtual-addresses/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/virtual-addresses/[id]/route.ts`
- Modify: `apps/saraya_square_app/lib/features/virtual_addresses/data/virtual_address_repository.dart`
- Modify: `apps/saraya_square_app/lib/features/virtual_addresses/presentation/virtual_addresses_screen.dart`
- Create: `apps/saraya_square_app/lib/features/virtual_addresses/presentation/virtual_address_form_sheet.dart`
- Test: `apps/lawyers.bh/lib/saraya/virtual-addresses/service.test.ts`
- Test: `apps/saraya_square_app/test/features/virtual_addresses/virtual_addresses_screen_test.dart`

**Interfaces:**
- Produces: `POST /virtual-addresses`, `PATCH /virtual-addresses/:id`, and `POST /virtual-addresses/:id/status` semantics through the item route.
- Produces: `VirtualAddressRepository.create`, `update`, and `changeStatus`.

- [ ] **Step 1: Add failing tests for assigning, editing, suspending and releasing a slot**

```ts
await service.assign(manager, propertyId, {
  code: "VA-001",
  tenantOrganizationId,
  businessName: "Example W.L.L.",
  monthlyFee: "35.000",
  startsOn: "2026-10-01",
});
expect(repository.assign).toHaveBeenCalledWith(expect.objectContaining({ propertyId }));
```

- [ ] **Step 2: Verify tests fail because only list exists**

Run: `pnpm vitest run lib/saraya/virtual-addresses && flutter test test/features/virtual_addresses`

- [ ] **Step 3: Implement server validation, state transitions and audit writes**

Allowed transitions are `available → reserved|active`, `reserved → active|available`, `active → suspended|inactive`, and `suspended → active|inactive`. A code remains unique inside the property.

- [ ] **Step 4: Implement the responsive form and contextual row/card actions**

Fields are code, tenant, registered business name, monthly fee, start date, end date and status. Confirmation is required before suspension or release.

- [ ] **Step 5: Run focused tests**

Run: `pnpm vitest run lib/saraya/virtual-addresses && flutter test test/features/virtual_addresses`

---

### Task 3: Meeting Room and Booking Administration

**Files:**
- Modify: `apps/lawyers.bh/lib/saraya/meeting-rooms/service.ts`
- Modify: `apps/lawyers.bh/lib/saraya/meeting-rooms/repository.ts`
- Modify: `apps/lawyers.bh/lib/saraya/meeting-rooms/http.ts`
- Modify: `apps/saraya_square_app/lib/features/meeting_rooms/data/meeting_room_repository.dart`
- Modify: `apps/saraya_square_app/lib/features/meeting_rooms/presentation/meeting_rooms_screen.dart`
- Create: `apps/saraya_square_app/lib/features/meeting_rooms/presentation/meeting_room_form_sheet.dart`
- Create: `apps/saraya_square_app/lib/features/meeting_rooms/presentation/booking_form_sheet.dart`
- Test: `apps/lawyers.bh/lib/saraya/meeting-rooms/service.test.ts`
- Test: `apps/saraya_square_app/test/features/meeting_rooms/meeting_rooms_screen_test.dart`

**Interfaces:**
- Consumes the existing meeting-room and booking routes.
- Produces Flutter methods `createRoom`, `updateRoom`, `createBooking`, `updateBooking`, `decideBooking`, and `cancelBooking`.

- [ ] **Step 1: Add failing tests for room editing, booking creation and overlap rejection**

```ts
await expect(service.createBooking(manager, propertyId, overlappingInput))
  .rejects.toMatchObject({ code: "MEETING_ROOM_TIME_CONFLICT" });
```

- [ ] **Step 2: Verify the tests expose missing client methods and incomplete update/cancel behavior**

Run: `pnpm vitest run lib/saraya/meeting-rooms && flutter test test/features/meeting_rooms`

- [ ] **Step 3: Complete server methods with operating-hours, capacity and overlap checks**

All mutations run in a transaction and append audit events. Booking decisions are allowed only from `pending`; cancellation is blocked after the booking begins.

- [ ] **Step 4: Add room edit and booking management sheets**

The screen displays room inventory followed by upcoming bookings. Buttons are derived from role and booking status.

- [ ] **Step 5: Run focused tests**

Run: `pnpm vitest run lib/saraya/meeting-rooms && flutter test test/features/meeting_rooms`

---

### Task 4: Maintenance Ticket Lifecycle

**Files:**
- Create: `apps/lawyers.bh/drizzle/0119_saraya_maintenance_events.sql`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Modify: `apps/lawyers.bh/lib/db/saraya-schema.ts`
- Modify: `apps/lawyers.bh/lib/saraya/maintenance/service.ts`
- Modify: `apps/lawyers.bh/lib/saraya/maintenance/repository.ts`
- Modify: `apps/lawyers.bh/lib/saraya/maintenance/http.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/maintenance-tickets/[id]/route.ts`
- Modify: `apps/saraya_square_app/lib/features/maintenance/data/maintenance_repository.dart`
- Modify: `apps/saraya_square_app/lib/features/maintenance/presentation/maintenance_screen.dart`
- Create: `apps/saraya_square_app/lib/features/maintenance/presentation/maintenance_form_sheet.dart`
- Test: `apps/lawyers.bh/lib/saraya/maintenance/service.test.ts`
- Test: `apps/saraya_square_app/test/features/maintenance/maintenance_screen_test.dart`

**Interfaces:**
- Produces: `create`, `update`, `assign`, `changeStatus`, and `addExpense` operations.

- [ ] **Step 1: Add failing tests for ticket creation, assignment, legal transitions and expense validation**

```ts
await service.changeStatus(manager, propertyId, ticketId, "resolved");
expect(repository.appendEvent).toHaveBeenCalledWith(expect.objectContaining({ toStatus: "resolved" }));
```

- [ ] **Step 2: Verify failures against the current list-only module**

Run: `pnpm vitest run lib/saraya/maintenance && flutter test test/features/maintenance`

- [ ] **Step 3: Implement transactional ticket mutations and immutable maintenance events**

Allowed status flow is `open → assigned → in_progress → awaiting_parts|resolved → closed`, with `cancelled` permitted before closure. Expenses must be non-negative BHD amounts.

- [ ] **Step 4: Implement create/edit/assign/status UI and timeline details**

The form captures unit, tenant, title, description and priority. State buttons are contextual and require confirmation for cancellation and closure.

- [ ] **Step 5: Run focused tests and migration**

Run: `pnpm vitest run lib/saraya/maintenance && flutter test test/features/maintenance`

---

### Task 5: Private Document Upload and Archive

**Files:**
- Modify: `apps/lawyers.bh/lib/saraya/documents/contracts.ts`
- Modify: `apps/lawyers.bh/lib/saraya/documents/service.ts`
- Modify: `apps/lawyers.bh/lib/saraya/documents/repository.ts`
- Modify: `apps/lawyers.bh/lib/saraya/documents/http.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/documents/[id]/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/documents/[id]/download/route.ts`
- Modify: `apps/saraya_square_app/pubspec.yaml`
- Modify: `apps/saraya_square_app/lib/features/documents/data/document_repository.dart`
- Modify: `apps/saraya_square_app/lib/features/documents/presentation/documents_screen.dart`
- Create: `apps/saraya_square_app/lib/features/documents/presentation/document_form_sheet.dart`
- Test: `apps/lawyers.bh/lib/saraya/documents/service.test.ts`
- Test: `apps/saraya_square_app/test/features/documents/documents_screen_test.dart`

**Interfaces:**
- Produces: multipart upload, metadata update, archive and signed download URL operations.

- [ ] **Step 1: Add failing tests for accepted files, rejected MIME/size, metadata edit, archive and scoped download**

```ts
await expect(service.upload(manager, propertyId, htmlFile))
  .rejects.toMatchObject({ code: "UNSUPPORTED_DOCUMENT_TYPE" });
```

- [ ] **Step 2: Verify failures because the module currently lists metadata only**

Run: `pnpm vitest run lib/saraya/documents && flutter test test/features/documents`

- [ ] **Step 3: Wire the existing private storage adapter to upload and signed download services**

Files are PDF, JPEG or PNG and at most 20 MiB. Metadata and storage writes compensate safely if either side fails. Archive keeps the object private and removes it from default active lists.

- [ ] **Step 4: Add Flutter file selection, upload progress, edit and archive actions**

The visible filename is sanitized, upload failures preserve the selected form values, and download opens only server-issued URLs.

- [ ] **Step 5: Run focused tests**

Run: `pnpm vitest run lib/saraya/documents && flutter test test/features/documents`

---

### Task 6: Operational CRUD Acceptance Test

**Files:**
- Create: `apps/saraya_square_app/test/acceptance/admin_operational_crud_test.dart`
- Modify: `apps/lawyers.bh/lib/saraya/static-bundle.test.ts`

**Interfaces:**
- Consumes all repository interfaces completed in Tasks 2–5.

- [ ] **Step 1: Write a failing administrator journey test**

The journey assigns a virtual address, edits a room, creates and approves a booking, creates and closes a maintenance ticket, uploads and archives a document, and verifies localized confirmations.

- [ ] **Step 2: Run the acceptance test and fix only integration gaps**

Run: `flutter test test/acceptance/admin_operational_crud_test.dart`

- [ ] **Step 3: Run the full verification suite**

Run: `flutter analyze && flutter test`

Run: `pnpm vitest run lib/saraya && pnpm tsc --noEmit`

- [ ] **Step 4: Build and publish the local web bundle**

Run: `flutter build web --release --base-href /saraya/ && dart run tool/publish_web.dart`

- [ ] **Step 5: Browser-check every affected route**

Verify `/virtual-addresses`, `/meeting-rooms`, `/maintenance`, and `/documents` in Arabic and at mobile width. Confirm create/edit/state actions and confirm zero browser warnings or errors.

---

## Following Plans

After this plan passes, write and execute separate plans for:

1. Contract creation, immutable versions and lifecycle actions.
2. Invoice creation, collection, receipts and balances.
3. Financial/operational reports, CSV export and the global audit timeline.
