# Country Admin Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle Country Management to match Admins & Permissions without changing country-setting behavior.

**Architecture:** Keep the existing state and API operations in `Content.tsx`, but rebuild its presentation with a red hero, styled search and alerts, and reusable country-card visual sections. Add pure presentation helpers for country counts and state labels so behavior can be tested without browser mocks.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Lucide icons, Vitest.

## Global Constraints

- Preserve `/api/admin/country-settings` and `/api/admin/country-settings/background` payloads.
- Preserve independent app and website toggles, website URL clearing, 4 MB image validation, pagination, RTL, and LTR.
- Use `#F7F8FA`, red gradient hero, transparent card borders, and red hover/focus borders.
- Do not add country creation, deletion, archiving, DNS, payment, or provisioning behavior.

---

### Task 1: Country presentation helpers

**Files:**
- Create: `apps/lawyers.bh/app/[locale]/admin/countries/country-view.ts`
- Create: `apps/lawyers.bh/app/[locale]/admin/countries/country-view.test.ts`

**Interfaces:**
- Produces: `summarizeCountries(countries)` returning `{ total, appEnabled, websiteEnabled, servicesReady }`.
- Produces: `getCountryReadinessLabel(country, isAr)` returning a bilingual readiness label.

- [ ] Write tests with literal country fixtures for active counts and Arabic/English readiness labels.
- [ ] Run the focused Vitest file and verify missing exports fail.
- [ ] Implement the two pure helpers.
- [ ] Run the focused test and require all assertions to pass.
- [ ] Commit the helpers and tests.

### Task 2: Restyle the Country Management page

**Files:**
- Modify: `apps/lawyers.bh/app/[locale]/admin/countries/Content.tsx`
- Modify: `apps/lawyers.bh/app/[locale]/admin/countries/page.test.ts`

**Interfaces:**
- Consumes: `summarizeCountries`, `getCountryReadinessLabel`, `AdminPagination`, existing APIs.
- Produces: the approved responsive page and card design.

- [ ] Add a failing component-source contract test for the gradient hero, Globe and Search icons, transparent/red card borders, image placeholder, status alerts, and upload control.
- [ ] Run the focused tests and verify failure against the old page.
- [ ] Rebuild only the JSX and visual class constants in `Content.tsx`; retain load, save, upload, filtering, and pagination behavior.
- [ ] Add per-country disabled/saving presentation using the existing `busy` state.
- [ ] Run country tests, admin-shell tests, TypeScript, ESLint for changed files, and `git diff --check`.
- [ ] Commit the visual refresh.

### Task 3: Production-shape verification

**Files:**
- No production file changes expected.

**Interfaces:**
- Consumes: completed country page.
- Produces: verification evidence only.

- [ ] Run all country and admin-focused Vitest tests.
- [ ] Run `pnpm exec tsc --noEmit --incremental false`.
- [ ] Run `next build --webpack` with the safe local placeholder database URL and record environment-only warnings separately.
- [ ] Confirm Git status is clean and review the final diff for unintended API or state changes.
