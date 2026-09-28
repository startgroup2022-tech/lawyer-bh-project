# LegalSOS Website App Country Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive website country availability and hero backgrounds from the same `channel=app` API used by the Flutter app.

**Architecture:** A same-origin Next.js route proxies and validates the backend app-country response. `SiteProvider` owns the dynamic list and selection, while country consumers render the provider list and `Hero` applies the selected HTTPS background URL.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library

## Global Constraints

- Read only from `${LEGAL_SOS_BACKEND_URL}/api/countries?channel=app`, defaulting to `https://www.lawyers.bh`.
- Never mutate country settings, databases, APIs, or deployment configuration.
- Never show the old hard-coded country list when the app-country request fails.
- Accept valid ISO alpha-2 countries returned by the backend.
- Preserve the current SOS click flow, responsive layout, RTL layout, and selected-country persistence.
- Use the existing hero image only when an enabled country has no valid HTTPS background.
- On first visit, request browser geolocation without opening the custom country dialog; keep manual selection available from the header.

---

### Task 1: Validate and proxy app countries

**Files:**
- Create: `apps/legal-sos-website/lib/app-countries.ts`
- Create: `apps/legal-sos-website/app/api/countries/route.ts`
- Create: `apps/legal-sos-website/test/app-countries.test.ts`

- [ ] Write parser tests for valid countries, malformed codes, non-HTTPS backgrounds, and duplicate codes.
- [ ] Run the focused test and verify it fails because the parser is missing.
- [ ] Implement `parseAppCountriesResponse(input: unknown): CountryConfig[]` and the read-only proxy route.
- [ ] Run the focused test and verify it passes.

### Task 2: Dynamic provider list and selection

**Files:**
- Modify: `apps/legal-sos-website/lib/countries.ts`
- Modify: `apps/legal-sos-website/components/providers/SiteProvider.tsx`
- Modify: `apps/legal-sos-website/components/CountryGate.tsx`
- Modify: `apps/legal-sos-website/components/SosDialog.tsx`
- Modify: `apps/legal-sos-website/lib/sos-schema.ts`
- Create: `apps/legal-sos-website/test/site-countries.test.tsx`

- [ ] Write a provider test proving a stale saved code is replaced by the first fetched code and only fetched countries are rendered.
- [ ] Run the test and verify the expected failure.
- [ ] Expose `countries`, loading, and error state from `SiteProvider`; validate every selection against the loaded list.
- [ ] Switch the country gate and SOS select to `site.countries` and change request validation to an ISO alpha-2 code.
- [ ] Run the focused provider test and existing schema tests.

### Task 3: Selected-country hero background

**Files:**
- Modify: `apps/legal-sos-website/components/Hero.tsx`
- Modify: `apps/legal-sos-website/app/globals.css`
- Modify: `apps/legal-sos-website/test/hero-sos.test.tsx`

- [ ] Extend the hero test to assert the selected country HTTPS background and fallback behavior.
- [ ] Run the focused test and verify it fails before the hero consumes `backgroundUrl`.
- [ ] Apply the selected background URL to `.hero-image` while retaining the CSS fallback.
- [ ] Run the focused tests, then all tests, typecheck, lint, build, and `git diff --check`.
