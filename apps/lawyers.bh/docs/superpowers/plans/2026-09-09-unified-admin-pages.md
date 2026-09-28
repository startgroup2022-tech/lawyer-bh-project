# Unified Admin Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every admin route the Admins & Permissions visual shell, correct localized navigation, and logout access without changing its business behavior.

**Architecture:** A route-aware `AdminRouteHeader` lives in the admin layout and renders once above every page. Shared class constants define the approved shell and card treatments; existing page components keep their workflows while duplicate top bars and conflicting outer shells are normalized.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, next-intl, Vitest.

## Global Constraints

- Every internal route under `/{locale}/admin/*` shows Dashboard and Logout.
- The root dashboard shows Back to Website and Logout.
- Contextual record navigation remains available.
- Existing authentication, permissions, data operations, RTL, and LTR behavior remain unchanged.
- Default card borders are transparent, with the Admins & Permissions red hover and focus treatment.

---

### Task 1: Shared route-aware admin header

**Files:**
- Create: `apps/lawyers.bh/components/admin/AdminRouteHeader.tsx`
- Create: `apps/lawyers.bh/components/admin/AdminRouteHeader.test.ts`
- Modify: `apps/lawyers.bh/app/[locale]/admin/layout.tsx`

**Interfaces:**
- Consumes: `useLocale()`, `usePathname()`, localized `Link`, and `AdminLogoutButton`.
- Produces: `AdminRouteHeader(): JSX.Element`, rendered exactly once by the admin layout.

- [ ] Write a source-level test asserting root and nested navigation labels, `/admin` and `/` destinations, logout composition, and layout inclusion.
- [ ] Run `pnpm exec vitest run components/admin/AdminRouteHeader.test.ts` and verify it fails because the component is absent.
- [ ] Implement the client header with `pathname === \`/${locale}/admin\`` root detection and the exact Admins & Permissions button classes.
- [ ] Wrap layout output in the shared `#F7F8FA` shell and render the header above `children`.
- [ ] Run the focused test and TypeScript; require both to pass.
- [ ] Commit the shared header and layout.

### Task 2: Remove duplicate page headers safely

**Files:**
- Modify: `apps/lawyers.bh/app/[locale]/admin/page.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/admin/admin-users/AdminUsersContent.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/admin/profile/Content.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/admin/faq/FaqAdminContent.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/admin/consultation-types/ConsultationTypesContent.tsx`
- Modify: every other admin page currently rendering its own Dashboard or Logout top bar.
- Create: `apps/lawyers.bh/app/[locale]/admin/adminShellCoverage.test.ts`

**Interfaces:**
- Consumes: the layout-provided `AdminRouteHeader`.
- Produces: pages with no duplicate global Dashboard/Logout controls while retaining contextual links.

- [ ] Write an inventory test that scans admin source files and rejects direct `AdminLogoutButton` composition outside the root shared component, with an explicit allowance for the header itself.
- [ ] Run the test and verify it fails on the known duplicate pages.
- [ ] Remove duplicate top bars and imports; keep Back to Lawyers, Back to Users, Back to Requests, and equivalent record-context links.
- [ ] Remove redundant outer top padding where the layout now owns it, without changing form/table logic.
- [ ] Run the inventory test, affected existing tests, and TypeScript.
- [ ] Commit duplicate-header cleanup.

### Task 3: Normalize page surfaces to Admins & Permissions

**Files:**
- Create: `apps/lawyers.bh/app/[locale]/admin/_components/admin-shell-styles.ts`
- Create: `apps/lawyers.bh/app/[locale]/admin/_components/admin-shell-styles.test.ts`
- Modify: admin page/content files with `border-gray-*`, `border bg-white`, or inconsistent `#F3F6FA`/`#F7F8FA` outer shells.

**Interfaces:**
- Produces: exported `ADMIN_PAGE`, `ADMIN_CARD`, `ADMIN_INTERACTIVE_CARD`, and `ADMIN_INPUT` class strings.
- Consumes: no business state or APIs.

- [ ] Write tests asserting transparent default card borders, red hover/focus borders, approved background, rounding, and responsive padding.
- [ ] Run the focused test and verify it fails because the style module is absent.
- [ ] Implement the style constants.
- [ ] Normalize each admin route's outer surface and primary cards, using the shared constants where practical and exact equivalent classes where component composition requires them.
- [ ] Preserve intentionally colored alert, destructive, selected, dashed upload, and status borders.
- [ ] Run admin-focused tests, TypeScript, ESLint on changed files, and `git diff --check`.
- [ ] Commit visual normalization.

### Task 4: Route inventory and final verification

**Files:**
- Modify: `apps/lawyers.bh/app/[locale]/admin/adminShellCoverage.test.ts`

**Interfaces:**
- Consumes: the complete admin route tree.
- Produces: a regression guard for current route coverage and required shared navigation.

- [ ] Enumerate every `page.tsx` below `app/[locale]/admin` and verify it inherits the single layout header.
- [ ] Verify Arabic/English labels and responsive button classes.
- [ ] Run all admin-focused Vitest files.
- [ ] Run `pnpm exec tsc --noEmit --incremental false`.
- [ ] Run ESLint on all changed implementation files and `git diff --check`.
- [ ] Run the production Next.js build; report database or environment failures separately from test/type evidence.
- [ ] Review the final diff for business-logic changes; none are allowed beyond shared navigation and styling.
- [ ] Commit final coverage adjustments.
