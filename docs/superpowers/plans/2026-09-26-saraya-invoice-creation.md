# Saraya Invoice Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use test-driven development and execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure multi-invoice creation for existing Saraya rental relationships from the bilingual invoices page.

**Architecture:** Flutter submits a validated JSON create command to the existing invoices endpoint. The Next.js service authorizes `billing:write`, and the repository resolves the rental relationship, inserts the invoice and immutable line item transactionally, and records an audit event.

**Tech Stack:** Flutter/Dart, Dio, Next.js Route Handlers, TypeScript, Drizzle, PostgreSQL, Vitest.

## Global Constraints

- Currency is fixed to BHD and amounts retain three-decimal precision.
- Only `super_admin` and `accountant` currently have `billing:write`.
- Preserve listing, payment links, pull-to-refresh, RTL/LTR, and unrelated dirty work.
- Do not create a payment charge, commit, or deploy publicly.

---

### Task 1: Backend invoice creation

**Files:**
- Modify: `apps/lawyers.bh/lib/saraya/rentals/invoice-service.ts`
- Modify: `apps/lawyers.bh/lib/saraya/rentals/invoice-repository.ts`
- Modify: `apps/lawyers.bh/lib/saraya/rentals/http.ts`
- Modify: `apps/lawyers.bh/app/api/saraya/v1/invoices/route.ts`
- Modify: `apps/lawyers.bh/lib/saraya/rentals/invoice-service.test.ts`
- Create: `apps/lawyers.bh/lib/saraya/rentals/invoice-http.test.ts`

**Interfaces:**
- Produces `createInvoiceService(repository, createId).create(principal, input)`.
- Produces `POST /api/saraya/v1/invoices` returning the created invoice.
- Produces `GET /api/saraya/v1/invoices?propertyId=...&targets=true` returning eligible rental request targets.

- [x] Write failing service and HTTP tests for permissions, validation, target listing, generated number, and transactional repository input.
- [x] Run focused Vitest tests and confirm failures are caused by missing create behavior.
- [x] Implement the create service, JSON handler, route export, transactional insert, and audit event.
- [x] Run focused tests and TypeScript validation.

### Task 2: Database constraint migration

**Files:**
- Create: `apps/lawyers.bh/drizzle/0119_saraya_multiple_invoices.sql`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Create: `apps/lawyers.bh/lib/saraya/rentals/invoice-migration.test.ts`

**Interfaces:**
- Removes only `saraya_invoices_property_request_key` so one rental relationship can have multiple invoices.
- Preserves property-number uniqueness and all foreign keys.

- [x] Write a failing migration contract test for the dropped one-invoice constraint and journal entry.
- [x] Run it and confirm the migration is absent.
- [x] Add the forward migration and journal metadata.
- [x] Run the migration contract test.

### Task 3: Flutter repository and creation form

**Files:**
- Modify: `apps/saraya_square_app/lib/features/invoices/domain/invoice.dart`
- Modify: `apps/saraya_square_app/lib/features/invoices/data/invoice_repository.dart`
- Modify: `apps/saraya_square_app/lib/features/invoices/presentation/invoices_screen.dart`
- Modify: `apps/saraya_square_app/lib/core/localization/app_ar.arb`
- Modify: `apps/saraya_square_app/lib/core/localization/app_en.arb`
- Modify: `apps/saraya_square_app/test/features/invoices/invoice_repository_test.dart`
- Modify: `apps/saraya_square_app/test/features/invoices/invoices_screen_test.dart`

**Interfaces:**
- Produces `InvoiceRepository.targets(String propertyId)` and `InvoiceRepository.create(String propertyId, InvoiceCreateInput input)`.
- Produces an add button, validated dialog, save feedback, and refreshed list.

- [x] Write failing repository and widget tests for POST, role visibility, form submission, and refresh.
- [x] Run focused Flutter tests and confirm expected failures.
- [x] Implement the input model, repository POST, localized form, validation, and refresh.
- [x] Generate localizations and run focused tests.

### Task 4: Final verification

- [x] Run Flutter analysis and the full Flutter test suite.
- [x] Run focused backend tests and TypeScript validation.
- [x] Build and publish the local web bundle.
- [x] Verify the invoices page and safe no-target state in the browser without creating production data; the populated creation dialog is covered by the widget test.
