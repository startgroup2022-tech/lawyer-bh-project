# Provider Paid Requests and Display Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore confirmed paid booking and emergency requests in the website provider dashboard and remove the subscription title before the provider name.

**Architecture:** Keep authentication, country scoping, ownership, and payment authorization on the server. Extract small pure normalization helpers that are covered independently, make the database predicates use the same trimmed case-insensitive semantics, and keep the dashboard responsible only for presentation.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, PostgreSQL, Vitest.

## Global Constraints

- Website provider dashboard only.
- Show only requests whose payment status is `paid` or `success` and whose Tap status is `CAPTURED`.
- Retain provider ID, normalized email fallback, and country ownership checks.
- Do not change payment collection, assignment, mobile applications, or public directory names.
- Show the stored localized provider name without a subscription prefix.

---

### Task 1: Normalize confirmed request ownership at the server boundary

**Files:**
- Modify: `lib/provider/provider-request-list.ts`
- Modify: `lib/provider/provider-request-list.test.ts`
- Modify: `app/api/provider/requests/route.ts`

**Interfaces:**
- Produces: `normalizeProviderOwnershipEmail(value: unknown): string`
- Preserves: `isProviderVisiblePaidRequest(input): boolean`
- Consumed by: the booking ownership predicate and provider email fallback in the route.

- [ ] **Step 1: Write failing normalization and payment-gate tests**

Add cases proving that surrounding whitespace and mixed case normalize correctly, while a non-captured payment remains hidden:

```ts
expect(normalizeProviderOwnershipEmail(" Lawyer@Example.COM ")).toBe("lawyer@example.com");
expect(isProviderVisiblePaidRequest({ paymentStatus: " PAID ", tapStatus: " captured " })).toBe(true);
expect(isProviderVisiblePaidRequest({ paymentStatus: "paid", tapStatus: "authorized" })).toBe(false);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest run lib/provider/provider-request-list.test.ts`

Expected: FAIL because `normalizeProviderOwnershipEmail` does not exist and the route SQL is not yet normalized.

- [ ] **Step 3: Implement the pure email normalizer**

```ts
export function normalizeProviderOwnershipEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}
```

- [ ] **Step 4: Align the database predicates with the pure predicates**

Use `lower(trim(coalesce(...)))` for `assignedToEmail` and `paymentStatus`, and `upper(trim(coalesce(...)))` for `tapStatus`. Apply the same confirmed-payment conditions to booking and emergency queries. Continue filtering returned rows with `isProviderVisiblePaidRequest` as defense in depth.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `pnpm exec vitest run lib/provider/provider-request-list.test.ts`

Expected: all provider request list tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/provider/provider-request-list.ts lib/provider/provider-request-list.test.ts app/api/provider/requests/route.ts
git commit -m "fix: restore confirmed provider requests"
```

---

### Task 2: Display only the stored provider name

**Files:**
- Create: `app/[locale]/provider-dashboard/providerDisplayName.ts`
- Create: `app/[locale]/provider-dashboard/providerDisplayName.test.ts`
- Modify: `app/[locale]/provider-dashboard/Content.tsx`

**Interfaces:**
- Produces: `providerDisplayName(profile, isArabic): string`
- Consumed by: dashboard header/avatar alternative text.

- [ ] **Step 1: Write the failing name-selection tests**

```ts
expect(providerDisplayName({ fullNameAr: "حبيب محمد", fullNameEn: "Habib Mohammed" }, true)).toBe("حبيب محمد");
expect(providerDisplayName({ fullNameAr: "حبيب محمد", fullNameEn: "" }, false)).toBe("حبيب محمد");
```

The expected strings contain no `المحامي` or `Lawyer` prefix.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest run 'app/[locale]/provider-dashboard/providerDisplayName.test.ts'`

Expected: FAIL because `providerDisplayName` does not exist.

- [ ] **Step 3: Implement localized fallback selection**

```ts
export function providerDisplayName(profile: { fullNameAr?: string | null; fullNameEn?: string | null }, isArabic: boolean) {
  const primary = String(isArabic ? profile.fullNameAr : profile.fullNameEn).trim();
  const fallback = String(isArabic ? profile.fullNameEn : profile.fullNameAr).trim();
  return primary || fallback;
}
```

- [ ] **Step 4: Replace the title-prefixed dashboard calculation**

Remove `getSubscriptionTitle` from `Content.tsx` and use `providerDisplayName(profile, isAr)` for every dashboard header and avatar label.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `pnpm exec vitest run 'app/[locale]/provider-dashboard/providerDisplayName.test.ts'`

Expected: all display-name tests PASS.

- [ ] **Step 6: Commit**

```bash
git add 'app/[locale]/provider-dashboard/providerDisplayName.ts' 'app/[locale]/provider-dashboard/providerDisplayName.test.ts' 'app/[locale]/provider-dashboard/Content.tsx'
git commit -m "fix: show provider name without title"
```

---

### Task 3: Regression verification and safe build

**Files:**
- Verify only; modify production files only if a failing test identifies an in-scope regression.

**Interfaces:**
- Consumes: the server request predicates and dashboard display-name helper from Tasks 1 and 2.
- Produces: fresh test, typecheck, and build evidence.

- [ ] **Step 1: Run focused regressions**

Run:

```bash
pnpm exec vitest run lib/provider/provider-request-list.test.ts 'app/[locale]/provider-dashboard/providerDisplayName.test.ts'
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run TypeScript**

Run: `pnpm exec tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 3: Run the safe Next.js build**

Run: `pnpm run build:next-only`

Expected: compile, TypeScript, page collection, and static generation complete with exit code 0.

- [ ] **Step 4: Review the final diff**

Run: `git diff --check && git status --short && git log --oneline -5`

Expected: no whitespace errors, no uncommitted implementation files, and the two focused commits at HEAD.

- [ ] **Step 5: Report deployment status accurately**

State that the fix is locally verified. Do not push `DEV` or merge `PRODUCTION` unless the user explicitly requests publishing; when requested, use the saved Omar deployment workflow.
