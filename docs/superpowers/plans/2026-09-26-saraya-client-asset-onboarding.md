# Saraya Client Asset Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add property-first tenant and owner onboarding with multi-unit draft leases, virtual-address reservations, and multi-property owner associations.

**Architecture:** Introduce a focused client-onboarding backend module with read-only option queries and transactional tenant/owner commands. Flutter uses dedicated onboarding models and sheets instead of stretching the generic CRUD form, while existing management lists and profile editing remain intact.

**Tech Stack:** Next.js Route Handlers, TypeScript, Drizzle, PostgreSQL, Vitest, Flutter, Dart, Dio.

## Global Constraints

- Preserve all unrelated dirty work and existing CRUD behavior.
- Every selected asset must belong to the selected property and be available at submission time.
- Tenant onboarding must create the tenant, draft leases, initial lease versions, and virtual-address reservations in one transaction.
- Owner onboarding must create all selected property associations in one transaction.
- Arabic RTL and English LTR must remain supported.
- Do not create real onboarding records during browser verification.
- Do not commit, push, or deploy publicly.

---

### Task 1: Backend onboarding contracts and transactional service

**Files:**
- Create: `apps/lawyers.bh/lib/saraya/client-onboarding/contracts.ts`
- Create: `apps/lawyers.bh/lib/saraya/client-onboarding/service.ts`
- Create: `apps/lawyers.bh/lib/saraya/client-onboarding/service.test.ts`

**Interfaces:**
- Produces `ClientOnboardingOptions`, `TenantOnboardingInput`, and `OwnerOnboardingInput`.
- Produces `createClientOnboardingService(repository)` with `options`, `createTenant`, and `createOwner` methods.

- [x] Write service tests for authorized properties, property-filtered available assets, mixed unit/address onboarding, cross-property rejection, unavailable assets, duplicate IDs, transactional rollback, and multi-property owners.
- [x] Run the focused service test and confirm the missing module failure.
- [x] Implement validation, authorization, and repository orchestration with stable localized errors.
- [x] Run the focused service test and confirm it passes.

### Task 2: Backend repository and HTTP routes

**Files:**
- Create: `apps/lawyers.bh/lib/saraya/client-onboarding/repository.ts`
- Create: `apps/lawyers.bh/lib/saraya/client-onboarding/http.ts`
- Create: `apps/lawyers.bh/lib/saraya/client-onboarding/http.test.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/client-onboarding/options/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/client-onboarding/tenants/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/client-onboarding/owners/route.ts`

**Interfaces:**
- Consumes the service contracts from Task 1.
- Produces property/asset option JSON and atomic onboarding POST endpoints.

- [x] Write HTTP tests for query parsing, payload parsing, authentication, and field-error responses.
- [x] Run the focused HTTP test and confirm it fails for missing handlers.
- [x] Implement Drizzle option queries and transactions for tenant, lease-version, address, owner, and audit writes.
- [x] Wire authenticated route handlers.
- [x] Run focused backend tests and `npx tsc --noEmit`.

### Task 3: Flutter onboarding repository and forms

**Files:**
- Create: `apps/saraya_square_app/lib/features/management/domain/client_onboarding.dart`
- Create: `apps/saraya_square_app/lib/features/management/data/client_onboarding_repository.dart`
- Create: `apps/saraya_square_app/lib/features/management/presentation/widgets/tenant_onboarding_sheet.dart`
- Create: `apps/saraya_square_app/lib/features/management/presentation/widgets/owner_onboarding_sheet.dart`
- Modify: `apps/saraya_square_app/lib/features/management/presentation/management_screen.dart`
- Modify: `apps/saraya_square_app/lib/app/dependencies.dart`
- Modify: `apps/saraya_square_app/lib/app/router.dart`
- Modify: `apps/saraya_square_app/lib/core/localization/app_ar.arb`
- Modify: `apps/saraya_square_app/lib/core/localization/app_en.arb`
- Test: `apps/saraya_square_app/test/features/management/client_onboarding_repository_test.dart`
- Test: `apps/saraya_square_app/test/features/management/management_screen_test.dart`

**Interfaces:**
- Produces `ClientOnboardingRepository.options`, `createTenant`, and `createOwner`.
- Tenant sheet loads properties first, then clears and reloads available units/addresses after property changes.
- Owner sheet submits multiple property IDs.

- [x] Write failing repository tests for option queries and onboarding payloads.
- [x] Write failing widget tests for property-first asset loading, mixed selections, stale-selection clearing, validation, and multi-property owners.
- [x] Run focused Flutter tests and confirm the expected failures.
- [x] Implement models, repository, dependency injection, localized sheets, and management-screen integration.
- [x] Generate localizations and run focused tests.

### Task 4: Verification and local publication

- [x] Run all focused backend tests and TypeScript validation.
- [x] Run Flutter analysis and the full Flutter test suite.
- [x] Build the Flutter web release with `/saraya/` base href and publish it to the local Next.js static bundle.
- [x] Verify tenant and owner onboarding forms in the browser without submitting real records.
- [x] Mark every completed plan item and leave the local page open.
