# Provider Paid Requests and Payment Balances Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show providers only captured paid requests in server-paginated bilingual lists and add provider-owned customer balances with safe Tap links and immutable commission allocations.

**Architecture:** Extract pure request eligibility/pagination/presentation and balance state/validation modules, then keep route handlers responsible for authentication, database selection, and external Tap calls. Store balance identity and monetary values before creating a link; confirm captured charges idempotently and allocate commission in one transaction.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM/PostgreSQL, Vitest, Tap Charges API.

## Global Constraints

- Provider list and detail APIs return requests only when payment is paid/successful and Tap status is exactly `CAPTURED`.
- Search and filters run before pagination; page size is exactly 10.
- Provider and lawyer name snapshots come from the authenticated database record, never browser input.
- Providers cannot manually mark a balance paid.
- A matching captured Tap charge creates at most one immutable allocation using the commission schedule effective at capture time.
- No live migration, Tap request, deployment, or production mutation occurs during local verification.

---

### Task 1: Paid request contract, labels, and pagination

**Files:**
- Create: `lib/provider/provider-request-list.ts`
- Create: `lib/provider/provider-request-list.test.ts`
- Modify: `app/api/provider/requests/route.ts`
- Modify: `app/api/provider/requests/[source]/[id]/route.ts`

**Interfaces:**
- Produces `isProviderVisiblePaidRequest({ paymentStatus, tapStatus })`, `localizeProviderCaseType(slug)`, and `paginateProviderRequests(items, query)`.
- API response is `{ ok, requests, pagination: { page, pageSize: 10, totalItems, totalPages } }`.

- [ ] Write failing literal-fixture tests for paid/CAPTURED eligibility, all six bilingual emergency labels, filter-before-pagination behavior, search, and out-of-range pages.
- [ ] Run the focused test and confirm failure because the module is missing.
- [ ] Implement the pure helpers and rerun until green.
- [ ] Select `tapStatus` in both request queries, enforce eligibility in SQL and again in the mapper, and return ten-row metadata.
- [ ] Apply the same eligibility guard to both request-detail route variants and return 404 for unpaid requests.
- [ ] Run the focused tests, existing lawyer eligibility tests, TypeScript, and diff checks.

### Task 2: Provider request list UI

**Files:**
- Modify: `app/[locale]/provider-dashboard/Content.tsx`
- Create: `app/[locale]/provider-dashboard/request-presentation.test.ts`

**Interfaces:**
- Consumes Task 1 labels and pagination metadata.

- [ ] Write failing presentation tests proving raw emergency slugs are never the primary Arabic/English label.
- [ ] Move request query/filter/page parameters to `/api/provider/requests`; debounce search and reset page on filter/search changes.
- [ ] Render ten rows, exact localized case labels, previous/next controls, and current/total page count.
- [ ] Run focused tests, TypeScript, lint, and diff checks.

### Task 3: Balance schema and state policy

**Files:**
- Create: `drizzle/0061_provider_customer_balances.sql`
- Create: `drizzle/verify_0061_provider_customer_balances.sql`
- Modify: `drizzle/meta/_journal.json`
- Modify: `lib/db/schema.ts`
- Create: `lib/payments/provider-balances.ts`
- Create: `lib/payments/provider-balances.test.ts`

**Interfaces:**
- Produces validated `ProviderBalanceDraft`, `canCreateProviderBalanceLink(status)`, `canCancelProviderBalance(status)`, and exact three-decimal parsing.
- Produces `schema.providerCustomerBalances` and an optional unique `providerBalanceId` source on payment allocations.

- [ ] Write failing tests for amount precision/bounds, required customer/description fields, immutable provider identity, and allowed state transitions.
- [ ] Implement pure validation/state helpers and rerun until green.
- [ ] Add balance and allocation-source migrations, checks, foreign keys, indexes, and Drizzle schema mappings.
- [ ] Validate journal JSON, migration structure, TypeScript, and diff checks without applying migrations.

### Task 4: Provider balance CRUD and pagination

**Files:**
- Create: `app/api/provider/balances/route.ts`
- Create: `app/api/provider/balances/[id]/route.ts`
- Create: `app/api/provider/balances/route.test.ts`

**Interfaces:**
- `POST /api/provider/balances` creates a draft from customer fields only.
- `GET /api/provider/balances?page=N` returns owned balances in pages of ten.
- `DELETE /api/provider/balances/[id]` cancels only an owned eligible balance.

- [ ] Write failing route/service tests for authentication, ownership, server-derived provider snapshots, validation, pagination, and forbidden transitions.
- [ ] Implement transactional draft creation, owned list projection, and cancellation.
- [ ] Run focused tests, TypeScript, lint, and diff checks.

### Task 5: Tap link and captured allocation

**Files:**
- Create: `lib/payments/provider-balance-payment.ts`
- Create: `lib/payments/provider-balance-payment.test.ts`
- Create: `app/api/provider/balances/[id]/payment-link/route.ts`
- Create: `app/api/tap/provider-balance/confirm/route.ts`
- Modify: `lib/payments/commission.ts`

**Interfaces:**
- Produces `createProviderBalancePaymentLink` and `confirmProviderBalanceCapture` with injected Tap/database boundaries for tests.

- [ ] Write failing tests proving only owned draft/expired balances create links, provider values cannot alter amount/reference, and paid balances conflict.
- [ ] Implement Tap charge creation using existing configuration/hash conventions and persist only sanitized identifiers/URL/state.
- [ ] Write failing tests for reference/amount/currency mismatch, non-CAPTURED state, same-charge idempotency, and exact one-allocation creation.
- [ ] Implement confirmation in one transaction using the current commission snapshot and unique provider-balance allocation.
- [ ] Run new and existing payment/commission tests, TypeScript, lint, and diff checks.

### Task 6: Balance and payment-link UI

**Files:**
- Modify: `app/[locale]/provider-dashboard/Content.tsx`
- Create: `app/[locale]/provider-dashboard/balance-presentation.ts`
- Create: `app/[locale]/provider-dashboard/balance-presentation.test.ts`

**Interfaces:**
- Consumes Tasks 4-5 routes; produces bilingual status/error/action labels.

- [ ] Write failing bilingual presentation tests for all statuses and allowed actions.
- [ ] Add Payment Links and Customer Balances tabs, draft form, ten-row list, page controls, copy-link, regenerate, and cancel actions.
- [ ] Keep payment creation an explicit action after draft persistence and never render a manual paid control.
- [ ] Run focused tests, TypeScript, lint, and diff checks.

### Task 7: Regression and visual verification

**Files:**
- Modify tests only when an observed regression requires coverage.

**Interfaces:**
- Verifies the completed local implementation.

- [ ] Run all provider request, payment eligibility, balance, commission, and Tap-focused tests.
- [ ] Run the full test suite, TypeScript, lint, and `pnpm run build:next-only` with Node 22.
- [ ] Run a browser walkthrough in Arabic and English at desktop/mobile widths only against an isolated migrated local database.
- [ ] Review final diff and report local tests, migration state, Tap-call state, browser evidence, deployment, and production separately.
