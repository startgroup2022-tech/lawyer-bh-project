# Saraya Square Public Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish an anonymous Saraya Square home page that shows public unit availability and safe virtual-address totals while preserving protected management routes.

**Architecture:** Extend the existing allow-listed public inventory service with a combined public-home projection, expose it through one anonymous read-only API route, and add a focused Flutter public-home feature. The router renders that feature at `/` while existing authenticated routes remain guarded.

**Tech Stack:** Next.js 16 route handlers, TypeScript, Drizzle ORM, Vitest, Flutter, Dart, Dio, GoRouter.

## Global Constraints

- Arabic RTL and English LTR are required.
- Do not expose virtual-address tenant, business, contract, or assignment data.
- Do not change authorization for `/dashboard`, `/units`, or any administrative route.
- Reuse the existing Saraya design tokens and public-unit projection.
- Implement test-first and verify each red-to-green cycle.

---

### Task 1: Safe Public Home API

**Files:**
- Modify: `apps/lawyers.bh/lib/saraya/public-inventory/service.ts`
- Modify: `apps/lawyers.bh/lib/saraya/public-inventory/runtime.ts`
- Modify: `apps/lawyers.bh/lib/saraya/public-inventory/service.test.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/public/home/route.ts`
- Test: `apps/lawyers.bh/lib/saraya/public-inventory/service.test.ts`

**Interfaces:**
- Produces: `PublicHomeInventory`, `PublicVirtualAddressSummary`, and `publicInventoryService.home(limit)`.
- Returns: `{ units, virtualAddresses: { total, available } }` with no private assignment fields.

- [ ] Write a failing service test for combined public units and aggregate virtual-address counts.
- [ ] Run the focused Vitest file and confirm the missing `home` behavior fails.
- [ ] Implement the allow-listed service contract, aggregate Drizzle query, and anonymous route.
- [ ] Run the focused test and TypeScript check until both pass.

### Task 2: Flutter Public Home Data Layer

**Files:**
- Create: `apps/saraya_square_app/lib/features/public_home/domain/public_home_inventory.dart`
- Create: `apps/saraya_square_app/lib/features/public_home/data/public_home_repository.dart`
- Create: `apps/saraya_square_app/test/features/public_home/public_home_repository_test.dart`
- Modify: `apps/saraya_square_app/lib/app/bootstrap.dart`
- Modify: `apps/saraya_square_app/lib/app/saraya_app.dart`

**Interfaces:**
- Produces: `PublicHomeRepository.load()` returning `PublicHomeInventory`.
- Consumes: `GET /api/saraya/v1/public/home?limit=12` through `SarayaApiClient`.

- [ ] Write a failing repository test for complete parsing and malformed-response rejection.
- [ ] Run the focused Flutter test and confirm it fails because the feature is absent.
- [ ] Implement immutable domain models and the API repository.
- [ ] Inject the repository through bootstrap and `SarayaApp`.
- [ ] Run the focused tests until they pass.

### Task 3: Public Home UI And Routing

**Files:**
- Create: `apps/saraya_square_app/lib/features/public_home/presentation/public_home_screen.dart`
- Create: `apps/saraya_square_app/test/features/public_home/public_home_screen_test.dart`
- Modify: `apps/saraya_square_app/lib/app/router.dart`
- Modify: `apps/saraya_square_app/test/app/router_test.dart`
- Modify: `apps/saraya_square_app/lib/core/localization/app_ar.arb`
- Modify: `apps/saraya_square_app/lib/core/localization/app_en.arb`

**Interfaces:**
- Produces: public `/` route and callbacks to `/login` and the availability section.
- Preserves: protected redirects for `/dashboard` and `/units`.

- [ ] Write failing router tests for anonymous `/` and protected `/dashboard`.
- [ ] Write failing widget tests for Arabic/English direction, unit cards, virtual-address totals, loading, empty, and error states.
- [ ] Run the focused tests and verify the failures describe the missing public page.
- [ ] Implement the responsive public screen and root-route behavior with existing theme tokens.
- [ ] Generate localization files and run focused tests until they pass.

### Task 4: Build, Publish, And Verify

**Files:**
- Modify generated localization files under `apps/saraya_square_app/lib/core/localization/`.
- Modify: `apps/lawyers.bh/public/saraya/` through `apps/saraya_square_app/tool/publish_web.dart`.

**Interfaces:**
- Produces: production static bundle at `/saraya/`.

- [ ] Run all Saraya backend tests and TypeScript checks.
- [ ] Run Flutter analyze and the full Flutter test suite.
- [ ] Build Flutter web with base href `/saraya/` and publish the bundle.
- [ ] Verify the static bundle test and anonymous local `/` behavior.
- [ ] Push DEV, merge to PRODUCTION, wait for Vercel success, and verify anonymous live home/API responses.
