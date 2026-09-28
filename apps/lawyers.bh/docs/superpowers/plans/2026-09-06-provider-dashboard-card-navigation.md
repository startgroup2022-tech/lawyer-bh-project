# Provider Dashboard Card Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the provider dashboard into a three-card landing page whose requests, balances/payment links, and profile sections each have a dedicated URL.

**Architecture:** Reuse the existing authenticated `Content` component as a shared shell with an explicit immutable `view` prop. Add a pure bilingual card catalog for the landing page and thin App Router page entries for each dedicated URL, while loading only the data required by the selected view.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, next-intl, Tailwind CSS, Lucide React, Vitest.

## Global Constraints

- Landing route: `/{locale}/provider-dashboard`.
- Requests route: `/{locale}/provider-dashboard/requests`.
- Combined balances and payment links route: `/{locale}/provider-dashboard/balances`.
- Profile route: `/{locale}/provider-dashboard/profile`.
- Preserve all existing APIs, authorization, payment behavior, request details, balance documents, validation, and approval states.
- Arabic is RTL and English is LTR through the existing locale layout.
- Do not include or modify `test/saraya-schema-contract.test.ts`.

---

### Task 1: Define the dashboard view and card catalog

**Files:**
- Create: `app/[locale]/provider-dashboard/providerDashboardNavigation.ts`
- Create: `app/[locale]/provider-dashboard/providerDashboardNavigation.test.ts`

**Interfaces:**
- Produces: `ProviderDashboardView = "home" | "requests" | "balances" | "profile"`.
- Produces: `providerDashboardCards(locale: string)` returning exactly three localized card descriptors with `view`, `href`, `title`, and `description`.
- Consumed by: the shared dashboard content and landing-card renderer.

- [ ] **Step 1: Write failing catalog tests**

Assert that Arabic and English each return exactly the three approved routes, that balances and payment links share one card, and that no tab-only route exists.

```ts
expect(providerDashboardCards("ar").map((card) => card.href)).toEqual([
  "/ar/provider-dashboard/requests",
  "/ar/provider-dashboard/balances",
  "/ar/provider-dashboard/profile",
]);
expect(providerDashboardCards("en")[1].title).toBe("Balances & Payment Links");
```

- [ ] **Step 2: Run RED**

Run: `pnpm exec vitest run 'app/[locale]/provider-dashboard/providerDashboardNavigation.test.ts'`

Expected: FAIL because the catalog module does not exist.

- [ ] **Step 3: Implement the typed bilingual catalog**

Return three immutable objects. Normalize every locale other than `ar` to English and interpolate the normalized locale into each href.

- [ ] **Step 4: Run GREEN**

Run: `pnpm exec vitest run 'app/[locale]/provider-dashboard/providerDashboardNavigation.test.ts'`

Expected: all navigation tests PASS.

- [ ] **Step 5: Commit**

```bash
git add 'app/[locale]/provider-dashboard/providerDashboardNavigation.ts' 'app/[locale]/provider-dashboard/providerDashboardNavigation.test.ts'
git commit -m "feat: define provider dashboard card navigation"
```

---

### Task 2: Convert the shared content into view-specific rendering

**Files:**
- Modify: `app/[locale]/provider-dashboard/Content.tsx`
- Create: `app/[locale]/provider-dashboard/providerDashboardView.test.ts`
- Create: `app/[locale]/provider-dashboard/providerDashboardView.ts`

**Interfaces:**
- `Content({ view }: { view: ProviderDashboardView })` renders the authenticated shell.
- `providerDashboardDataNeeds(view)` returns `{ requests: boolean; balances: boolean }` for deterministic loading tests.

- [ ] **Step 1: Write failing data-isolation tests**

```ts
expect(providerDashboardDataNeeds("home")).toEqual({ requests: false, balances: false });
expect(providerDashboardDataNeeds("requests")).toEqual({ requests: true, balances: false });
expect(providerDashboardDataNeeds("balances")).toEqual({ requests: false, balances: true });
expect(providerDashboardDataNeeds("profile")).toEqual({ requests: false, balances: false });
```

- [ ] **Step 2: Run RED**

Run: `pnpm exec vitest run 'app/[locale]/provider-dashboard/providerDashboardView.test.ts'`

Expected: FAIL because the view helper does not exist.

- [ ] **Step 3: Implement the view data-needs helper**

Create the pure mapping and import it into `Content.tsx`.

- [ ] **Step 4: Make `Content` view-driven**

Replace mutable top-level tab navigation with the required `view` prop. Keep shared profile/session/access loading. After profile access succeeds, load requests only for `requests`, balances only for `balances`, and neither for `home` or `profile`. Restrict request search effects to the requests view.

- [ ] **Step 5: Render landing cards**

For `home`, render three semantic localized links in an admin-style responsive grid: rounded 3XL white card, subtle border/shadow, tinted icon block, title, description, focus ring, and directional icon.

- [ ] **Step 6: Render dedicated section controls**

For non-home views, show a localized back link to `/{locale}/provider-dashboard`. Render the existing requests section only for `requests`, the existing creation form and balance/link table together for `balances`, and the existing profile form only for `profile`. Remove the old pill tab row.

- [ ] **Step 7: Run GREEN and existing helper regressions**

Run:

```bash
pnpm exec vitest run 'app/[locale]/provider-dashboard/providerDashboardView.test.ts' 'app/[locale]/provider-dashboard/providerDashboardNavigation.test.ts' 'app/[locale]/provider-dashboard/providerDisplayName.test.ts' 'app/[locale]/provider-dashboard/providerBalanceActions.test.ts'
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add 'app/[locale]/provider-dashboard/Content.tsx' 'app/[locale]/provider-dashboard/providerDashboardView.ts' 'app/[locale]/provider-dashboard/providerDashboardView.test.ts'
git commit -m "feat: render provider dashboard as dedicated views"
```

---

### Task 3: Add the dedicated App Router pages

**Files:**
- Modify: `app/[locale]/provider-dashboard/page.tsx`
- Create: `app/[locale]/provider-dashboard/requests/page.tsx`
- Create: `app/[locale]/provider-dashboard/balances/page.tsx`
- Create: `app/[locale]/provider-dashboard/profile/page.tsx`
- Create: `app/[locale]/provider-dashboard/providerDashboardRoutes.test.ts`

**Interfaces:**
- Each page sets the request locale and passes one fixed view to `Content`.
- Each page exposes localized metadata matching its section.

- [ ] **Step 1: Write failing route-source tests**

Read each page source and assert the exact fixed view: landing `home`, requests `requests`, balances `balances`, and profile `profile`. Assert localized titles are present.

- [ ] **Step 2: Run RED**

Run: `pnpm exec vitest run 'app/[locale]/provider-dashboard/providerDashboardRoutes.test.ts'`

Expected: FAIL because the three child pages do not exist and the landing page does not pass `home`.

- [ ] **Step 3: Add the thin localized pages**

Each page awaits `{ locale }`, calls `setRequestLocale(locale)`, returns `<Content view="..." />`, and supplies Arabic/English metadata title text.

- [ ] **Step 4: Run GREEN**

Run: `pnpm exec vitest run 'app/[locale]/provider-dashboard/providerDashboardRoutes.test.ts'`

Expected: all route tests PASS.

- [ ] **Step 5: Commit**

```bash
git add 'app/[locale]/provider-dashboard/page.tsx' 'app/[locale]/provider-dashboard/requests/page.tsx' 'app/[locale]/provider-dashboard/balances/page.tsx' 'app/[locale]/provider-dashboard/profile/page.tsx' 'app/[locale]/provider-dashboard/providerDashboardRoutes.test.ts'
git commit -m "feat: add dedicated provider dashboard pages"
```

---

### Task 4: Verify behavior and responsive UI

**Files:**
- Verify only; change files only for an in-scope failure demonstrated by a test or browser check.

**Interfaces:**
- Consumes all dedicated dashboard routes and shared view behavior.
- Produces fresh automated and visual evidence.

- [ ] **Step 1: Run all focused provider tests**

Run navigation, view, route, display-name, balance-action, provider-request SQL, and provider-request list tests. Expected: zero failures.

- [ ] **Step 2: Run TypeScript**

Run: `pnpm exec tsc --noEmit`. Expected: exit code 0.

- [ ] **Step 3: Run the safe build**

Run: `pnpm run build:next-only`. Expected: all four provider dashboard routes appear and build exits 0.

- [ ] **Step 4: Browser-check the four routes**

At phone and desktop widths, verify the landing card grid, navigation/back links, RTL/LTR direction, no horizontal overflow, and that each child route shows only its intended content. Authentication redirects or locked-account states must remain functional.

- [ ] **Step 5: Review repository state**

Run: `git diff --check && git status --short && git log --oneline -8`. Confirm `test/saraya-schema-contract.test.ts` remains untouched and untracked.

- [ ] **Step 6: Report local versus deployed status**

Do not publish unless explicitly requested. When publishing is requested, push DEV, merge DEV into PRODUCTION with `omaralnadeem-max <omaralnadeem@gmail.com>`, and verify both remote refs.
