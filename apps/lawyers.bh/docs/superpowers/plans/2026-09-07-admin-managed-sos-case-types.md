# Admin-Managed SOS Case Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let administrators manage country-specific SOS cases and custom icons, expose workflow metadata to LegalSOS, and add the paid direct-consultation matching flow.

**Architecture:** Extend the existing inherited country catalogue instead of introducing a second source of truth. Deliver in three independently testable slices: catalogue/admin/API, unchanged-style Flutter consumption and routing, then a server-authoritative paid consultation state machine that reuses existing payment, availability, communication, and call systems.

**Tech Stack:** Next.js App Router, TypeScript, PostgreSQL/Drizzle and `postgres`, Vitest, Flutter/Dart, Tap payment confirmation, existing realtime communication services.

## Global Constraints

- Preserve the current mobile SOS case-list style and existing `emergency_dispatch` behavior.
- Existing catalogue rows default to `emergency_dispatch`.
- Admin controls country, bilingual name/description/action label, price, currency, order, active state, workflow, and SVG/transparent PNG icon.
- Stable case IDs/slugs remain unchanged after creation.
- Direct consultation is payment first, then lawyer proposal, client approval, five-minute lawyer acceptance, chat, and call.
- Lawyer rejection, timeout, or client decline cycles to another lawyer without another charge.
- Payment and deadlines are authoritative on the server; repeated actions are idempotent.
- No production migration or deployment occurs without separate release verification.

---

### Task 1: Catalogue migration and domain validation

**Files:**
- Create: `apps/lawyers.bh/drizzle/0068_sos_case_admin_catalog.sql`
- Create: `apps/lawyers.bh/drizzle/verify_0068_sos_case_admin_catalog.sql`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Modify: `apps/lawyers.bh/lib/db/schema.ts`
- Create: `apps/lawyers.bh/lib/sos/admin-case-types.ts`
- Create: `apps/lawyers.bh/lib/sos/admin-case-types.test.ts`

**Interfaces:**
- Produces: `SosWorkflow = "emergency_dispatch" | "direct_consultation"`; `parseAdminSosCaseInput(input)`; catalogue columns `workflow_type`, `icon_asset_url`, and `icon_storage_key`.

- [ ] Write failing validation tests for normalized slug creation, immutable slug edits, bilingual required fields, positive 3-decimal price, uppercase 3-letter currency, integer order, supported workflow, active flag, and valid icon metadata.
- [ ] Run `pnpm vitest run lib/sos/admin-case-types.test.ts` and confirm missing-module failure.
- [ ] Add migration columns with `workflow_type NOT NULL DEFAULT 'emergency_dispatch'`, a workflow check constraint, nullable icon URL/key for existing rows, and matching provisioning changes for every country child table.
- [ ] Add schema fields and implement exact validation with stable error codes: `invalid_slug`, `invalid_name`, `invalid_description`, `invalid_action_type`, `invalid_price`, `invalid_currency`, `invalid_order`, `invalid_workflow`, and `invalid_icon`.
- [ ] Run the focused test and `pnpm exec tsc --noEmit --incremental false`.

### Task 2: Catalogue repository and public API projection

**Files:**
- Modify: `apps/lawyers.bh/lib/sos/emergencyCaseCatalog.ts`
- Create: `apps/lawyers.bh/lib/sos/emergencyCaseCatalog.test.ts`
- Modify: `apps/lawyers.bh/app/api/sos/case-types/route.ts`
- Create: `apps/lawyers.bh/app/api/sos/case-types/route.test.ts`

**Interfaces:**
- Produces: catalogue fields `workflowType: SosWorkflow`, `iconUrl: string | null`, and backward-compatible `iconKey`.

- [ ] Write failing repository/API tests proving country-scoped active-only ordering and response fields `workflowType`, `iconUrl`, and `iconKey`.
- [ ] Extend `EmergencyCaseRow`, both SELECT lists, `EmergencyCaseCatalogItem`, and `mapRow`; map absent workflow to `emergency_dispatch` and blank URL to null.
- [ ] Extend the GET projection without changing existing field names or cache policy.
- [ ] Run focused Vitest tests and typecheck.

### Task 3: Admin repository and authenticated CRUD routes

**Files:**
- Create: `apps/lawyers.bh/lib/sos/admin-case-repository.ts`
- Create: `apps/lawyers.bh/lib/sos/admin-case-repository.test.ts`
- Create: `apps/lawyers.bh/app/api/admin/sos-case-types/route.ts`
- Create: `apps/lawyers.bh/app/api/admin/sos-case-types/[id]/route.ts`
- Create: `apps/lawyers.bh/app/api/admin/sos-case-types/reorder/route.ts`
- Create: `apps/lawyers.bh/app/api/admin/sos-case-types/routes.test.ts`

**Interfaces:**
- Produces: `listAdminSosCases(countryCode)`, `createAdminSosCase(input, adminId)`, `updateAdminSosCase(id, input, expectedUpdatedAt, adminId)`, `setAdminSosCaseOrder(countryCode, orderedIds, adminId)`.

- [ ] Write failing tests for permission denial, country isolation, create, edit, stale timestamp conflict, deactivation, reordering, immutable slug, and audit data.
- [ ] Reuse `requireAdminPermission("manage_approvals")`; resolve country tables with `getActiveCountry`/`buildCountryTableSet`; use transactions for stale-write and ordering guarantees.
- [ ] Return stable statuses: 400 validation, 401/403 authorization, 404 missing, 409 stale/slug conflict, and 200/201 success.
- [ ] Run route/repository tests and typecheck.

### Task 4: Safe custom icon upload

**Files:**
- Create: `apps/lawyers.bh/lib/sos/icon-upload.ts`
- Create: `apps/lawyers.bh/lib/sos/icon-upload.test.ts`
- Create: `apps/lawyers.bh/app/api/admin/sos-case-types/icon/route.ts`

**Interfaces:**
- Produces: `validateSosIcon(file): Promise<{ bytes; extension; contentType }>` and authenticated upload response `{ storageKey: string; url: string }`.

- [ ] Write failing tests for real PNG signature, sanitized SVG, script/external-reference rejection, MIME spoofing, empty files, and 2 MB maximum.
- [ ] Use the existing project storage adapter used by country/admin assets; generate keys under `sos-case-icons/<uuid>.<ext>` and never use the original filename.
- [ ] Require `manage_approvals`; upload only after validation; return `invalid_icon_type`, `invalid_icon_content`, or `icon_too_large`.
- [ ] Run focused tests and typecheck.

### Task 5: Admin SOS cases page

**Files:**
- Create: `apps/lawyers.bh/app/[locale]/admin/sos-cases/page.tsx`
- Create: `apps/lawyers.bh/app/[locale]/admin/sos-cases/SosCasesAdminContent.tsx`
- Create: `apps/lawyers.bh/app/[locale]/admin/sos-cases/adminPage.test.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/admin/page.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/admin/profile/Content.tsx`

**Interfaces:**
- Consumes CRUD and icon routes from Tasks 3-4.
- Produces bilingual admin list/editor with country filter, preview, create/edit/deactivate/reorder behavior.

- [ ] Write failing UI tests for permission routing, all form controls, SVG/PNG accept value, preview, stale error, create/edit/deactivate, and reorder payload.
- [ ] Add protected page using `requireAdminPermission("manage_approvals")`.
- [ ] Implement list and editor with explicit controlled fields, inline localized error map, upload-before-save, and disabled submit while saving.
- [ ] Add dashboard/profile navigation entry `حالات SOS` / `SOS cases`.
- [ ] Run UI tests, typecheck, and browser-check Arabic and English layouts.

### Task 6: Flutter catalogue fields and custom icon rendering

**Files:**
- Modify: `/Users/hma/legalsos_app/lib/features/client/emergency/data/models/emergency_case_type.dart`
- Modify: `/Users/hma/legalsos_app/lib/features/client/emergency/screens/select_emergency_type_screen.dart`
- Create: `/Users/hma/legalsos_app/test/features/client/emergency/emergency_case_type_test.dart`
- Create: `/Users/hma/legalsos_app/test/features/client/emergency/select_emergency_type_screen_test.dart`

**Interfaces:**
- Produces: `workflowType`, `iconUrl`, `isDirectConsultation`; existing `iconKey` fallback remains.

- [ ] Write failing JSON parsing and widget tests with literal API fixtures for both workflows, network image success/failure, order, and unchanged card structure.
- [ ] Parse workflow with safe `emergency_dispatch` fallback and nullable absolute HTTPS icon URL.
- [ ] Replace only the icon child with clipped `Image.network`; keep size, card spacing, colors, and `_iconFor` fallback through `errorBuilder`.
- [ ] Run focused Flutter tests and analyze the changed files.

### Task 7: Flutter workflow routing and no-location consultation entry

**Files:**
- Modify: `/Users/hma/legalsos_app/lib/features/client/emergency/screens/select_emergency_type_screen.dart`
- Create: `/Users/hma/legalsos_app/lib/features/client/consultation/screens/direct_consultation_checkout_screen.dart`
- Create: `/Users/hma/legalsos_app/test/features/client/consultation/direct_consultation_routing_test.dart`

**Interfaces:**
- Produces: emergency route unchanged; direct consultation route skips location, collects owner/contact data, and continues to existing payment with the catalogue ID/price.

- [ ] Write failing routing tests proving emergency opens `RequestOwnerInfoScreen` and consultation never builds the location step before checkout.
- [ ] Branch only on `emergencyCase.isDirectConsultation`; reuse owner validation and payment session contracts without duplicating payment logic.
- [ ] Persist the paid request identity using existing confirmed-request persistence.
- [ ] Run focused routing/payment tests and analyzer.

### Task 8: Server consultation matching state machine

**Files:**
- Create: `apps/lawyers.bh/drizzle/0069_direct_consultation_matching.sql`
- Create: `apps/lawyers.bh/drizzle/verify_0069_direct_consultation_matching.sql`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Create: `apps/lawyers.bh/lib/sos/direct-consultation-state.ts`
- Create: `apps/lawyers.bh/lib/sos/direct-consultation-state.test.ts`
- Create: `apps/lawyers.bh/lib/sos/direct-consultation-repository.ts`
- Create: `apps/lawyers.bh/lib/sos/direct-consultation-service.ts`
- Create: `apps/lawyers.bh/lib/sos/direct-consultation-service.test.ts`

**Interfaces:**
- Produces states `paid_matching`, `client_proposal`, `lawyer_pending`, `matched`, `no_lawyer`; deadline exactly 5 minutes from server time; one winning lawyer.

- [ ] Write failing transition tests including unpaid rejection, proposal/decline, client approval, lawyer reject, expiry, next-lawyer exclusion, duplicate actions, and concurrency.
- [ ] Add request/proposal/exclusion records with unique active proposal and winner constraints; preserve payment allocation identity.
- [ ] Implement transactional service methods `startMatching`, `approveProposal`, `declineProposal`, `lawyerAccept`, `lawyerReject`, and `getState` using existing availability eligibility.
- [ ] Resolve/create the existing communication thread only on `matched`.
- [ ] Run state/service tests, migration verification against a disposable database, and typecheck.

### Task 9: Matching APIs, Flutter waiting flow, chat and call

**Files:**
- Create: `apps/lawyers.bh/app/api/sos/consultations/[id]/state/route.ts`
- Create: `apps/lawyers.bh/app/api/sos/consultations/[id]/proposal/approve/route.ts`
- Create: `apps/lawyers.bh/app/api/sos/consultations/[id]/proposal/decline/route.ts`
- Create: `apps/lawyers.bh/app/api/sos/lawyer/consultations/[id]/accept/route.ts`
- Create: `apps/lawyers.bh/app/api/sos/lawyer/consultations/[id]/reject/route.ts`
- Create: `/Users/hma/legalsos_app/lib/features/client/consultation/data/direct_consultation_api.dart`
- Create: `/Users/hma/legalsos_app/lib/features/client/consultation/screens/consultation_matching_screen.dart`
- Create: `/Users/hma/legalsos_app/test/features/client/consultation/consultation_matching_test.dart`

**Interfaces:**
- Produces authenticated/idempotent proposal and acceptance endpoints; mobile resumes by request ID and opens existing chat on `matched` with its existing header call action.

- [ ] Write failing API/mobile tests for paid start, proposed lawyer display, approve/decline, server deadline, timeout cycling, restart recovery, matched thread, and no duplicate payment.
- [ ] Implement authenticated endpoints over Task 8 service with stable error codes.
- [ ] Implement bounded polling plus app-resume refresh; render five-minute server deadline without treating the device clock as authoritative.
- [ ] On `matched`, navigate once to the existing communication chat; verify its call button remains visible and functional.
- [ ] Run focused server and Flutter tests.

### Task 10: Final verification

**Files:** no new production files.

- [ ] Run `pnpm vitest run` for all SOS/admin/payment/communication tests added or touched.
- [ ] Run `pnpm exec tsc --noEmit --incremental false` and `pnpm run build:next-only`; report build separately if an unrelated page-data configuration error remains.
- [ ] Run Flutter focused tests, `flutter analyze` on changed modules, and `git diff --check` in both repositories.
- [ ] Browser-check Arabic/English admin create/edit/icon preview and public API response.
- [ ] Simulator-check unchanged SOS list style, custom icon fallback, emergency regression, direct consultation payment, lawyer proposal, five-minute acceptance, chat, call, timeout/retry, and restart recovery.
- [ ] Keep database migration application and production deployment as explicit release steps with separate evidence.
