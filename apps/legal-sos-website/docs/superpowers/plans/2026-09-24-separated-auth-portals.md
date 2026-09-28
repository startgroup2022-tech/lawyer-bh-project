# LegalSOS Separated Authentication Portals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mixed LegalSOS role tabs with independent user, lawyer, and administration portal pages.

**Architecture:** Keep the existing client authentication and tracking logic in a client-only `PortalShell`, while a new gateway routes each account type to a dedicated page. Lawyer registration and administration access live in focused components so changing routes unmounts and isolates all role-specific form and error state.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Testing Library, existing LegalSOS `SiteProvider` and translation dictionaries.

## Global Constraints

- No shared account-type tabs or in-page role switching.
- Preserve `/api/client-auth/*`, `/api/lawyer/register`, the database schema, payment flows, and Lawyers.bh account contracts.
- Lawyer sign-in remains `https://www.lawyers.bh/{locale}/login/provider`.
- Administration sign-in remains `https://www.lawyers.bh/{locale}/login/admin`, with no administration registration.
- Lawyer registration must not mount until a valid two-letter country code is loaded.
- Preserve Arabic RTL and English/Turkish LTR presentation.

---

### Task 1: Account gateway and dedicated routes

**Files:**
- Create: `apps/legal-sos-website/components/PortalGateway.tsx`
- Create: `apps/legal-sos-website/app/[locale]/portal/client/page.tsx`
- Create: `apps/legal-sos-website/app/[locale]/portal/lawyer/page.tsx`
- Create: `apps/legal-sos-website/app/[locale]/portal/admin/page.tsx`
- Modify: `apps/legal-sos-website/app/[locale]/portal/page.tsx`
- Modify: `apps/legal-sos-website/lib/translations/ar.ts`
- Modify: `apps/legal-sos-website/lib/translations/en.ts`
- Modify: `apps/legal-sos-website/lib/translations/tr.ts`
- Test: `apps/legal-sos-website/test/separated-auth-portals.test.tsx`

**Interfaces:**
- Produces: `PortalGateway({ locale, dictionary })`, linking to `/${locale}/portal/client`, `/${locale}/portal/lawyer`, and `/${locale}/portal/admin`.
- Produces: three locale-validated route pages wrapped with the existing header and site provider pattern.
- Consumes: `Locale`, `Dictionary`, `getDictionary`, `isLocale`, and existing `Header`/`SiteProvider` components.

- [ ] **Step 1: Write the failing gateway test**

Render `PortalGateway` with the Arabic dictionary and assert the three literal destinations. Also assert there are no email/password fields and no role-tab group.

```tsx
render(<PortalGateway locale="ar" dictionary={getDictionary("ar")} />);
expect(screen.getByRole("link", { name: /المستخدم/ })).toHaveAttribute("href", "/ar/portal/client");
expect(screen.getByRole("link", { name: /المحامي/ })).toHaveAttribute("href", "/ar/portal/lawyer");
expect(screen.getByRole("link", { name: /الإدارة/ })).toHaveAttribute("href", "/ar/portal/admin");
expect(screen.queryByLabelText(/البريد الإلكتروني/)).not.toBeInTheDocument();
expect(screen.queryByRole("group")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm --dir apps/legal-sos-website vitest run test/separated-auth-portals.test.tsx`

Expected: FAIL because `PortalGateway` and the dedicated routes do not exist.

- [ ] **Step 3: Add translation keys and implement the gateway**

Add `portal.gateway` keys for title, intro, user title/description/action, lawyer title/description/action, administration title/description/action, and back. Implement three semantic cards with normal Next.js links. The component renders no forms and owns no authentication state.

- [ ] **Step 4: Replace the root portal content and add route shells**

Change `/{locale}/portal` to render `PortalGateway`. Add the three locale-validated pages using the same `notFound`, `Header`, `SiteProvider`, `CountryGate`, and `SosDialog` structure as the current portal page. Initially render role-specific headings so the routes compile; later tasks replace their content with the dedicated components.

- [ ] **Step 5: Run the focused test and typecheck**

Run:

```bash
pnpm --dir apps/legal-sos-website vitest run test/separated-auth-portals.test.tsx
pnpm --dir apps/legal-sos-website typecheck
```

Expected: PASS and no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add apps/legal-sos-website/app/'[locale]'/portal apps/legal-sos-website/components/PortalGateway.tsx apps/legal-sos-website/lib/translations apps/legal-sos-website/test/separated-auth-portals.test.tsx
git commit -m "feat: add separate LegalSOS portal routes"
```

---

### Task 2: Make the existing portal client-only

**Files:**
- Modify: `apps/legal-sos-website/components/PortalShell.tsx`
- Modify: `apps/legal-sos-website/app/[locale]/portal/client/page.tsx`
- Modify: `apps/legal-sos-website/test/portal-role-login.test.tsx`
- Modify: `apps/legal-sos-website/test/separated-auth-portals.test.tsx`

**Interfaces:**
- Produces: `PortalShell` as a client-only authentication and request-tracking workspace.
- Consumes: existing client auth endpoints, token storage, tracking state, and `SiteProvider` country data.

- [ ] **Step 1: Replace the obsolete shared-role tests with failing client-isolation tests**

Render `PortalShell` directly and assert that its idle card offers only user sign-in and user account creation. It must not render links or text for lawyer/admin access.

```tsx
expect(screen.getByRole("button", { name: dictionary.portal.auth.signIn })).toBeInTheDocument();
expect(screen.getByRole("button", { name: dictionary.portal.auth.createAccount })).toBeInTheDocument();
expect(screen.queryByText(dictionary.portal.gateway.lawyerTitle)).not.toBeInTheDocument();
expect(screen.queryByText(dictionary.portal.gateway.adminTitle)).not.toBeInTheDocument();
```

Click sign-in and create-account independently, verifying the correct fields and that errors/forms from the previous action are reset.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `pnpm --dir apps/legal-sos-website vitest run test/portal-role-login.test.tsx test/separated-auth-portals.test.tsx`

Expected: FAIL because the current component still contains role chooser and role tabs.

- [ ] **Step 3: Remove shared role state and lawyer rendering from `PortalShell`**

Delete `activeRole`, `openRoleChooser`, the choose mode, role-switcher markup, `LawyerRegistrationFlow` import, and role-dependent CSS hooks. The idle sign-in button calls `openAuthMode("signin")` directly. Keep the existing client sign-in, account creation, OTP, session, tracking, and SOS behavior unchanged.

- [ ] **Step 4: Mount `PortalShell` only on the client route**

Update `/{locale}/portal/client` to render the client-only shell inside `Suspense`, with a visible link back to `/{locale}/portal`.

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```bash
pnpm --dir apps/legal-sos-website vitest run test/portal-role-login.test.tsx test/separated-auth-portals.test.tsx
pnpm --dir apps/legal-sos-website typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/legal-sos-website/components/PortalShell.tsx apps/legal-sos-website/app/'[locale]'/portal/client/page.tsx apps/legal-sos-website/test
git commit -m "fix: isolate LegalSOS client authentication"
```

---

### Task 3: Dedicated lawyer and administration access pages

**Files:**
- Create: `apps/legal-sos-website/components/LawyerAccessPortal.tsx`
- Create: `apps/legal-sos-website/components/AdminAccessPortal.tsx`
- Modify: `apps/legal-sos-website/app/[locale]/portal/lawyer/page.tsx`
- Modify: `apps/legal-sos-website/app/[locale]/portal/admin/page.tsx`
- Modify: `apps/legal-sos-website/test/separated-auth-portals.test.tsx`

**Interfaces:**
- Produces: `LawyerAccessPortal({ locale, dictionary })`, with lawyer sign-in and an explicit registration reveal action.
- Produces: `AdminAccessPortal({ locale, dictionary })`, with administration sign-in only.
- Consumes: `useSite()` and existing `LawyerRegistrationFlow`.

- [ ] **Step 1: Write failing lawyer and admin isolation tests**

For the lawyer page, assert:

```tsx
expect(screen.getByRole("link", { name: dictionary.portal.gateway.lawyerSignIn })).toHaveAttribute(
  "href", "https://www.lawyers.bh/ar/login/provider",
);
expect(screen.getByRole("button", { name: dictionary.portal.gateway.lawyerRegister })).toBeInTheDocument();
expect(screen.queryByLabelText(dictionary.portal.auth.email)).not.toBeInTheDocument();
```

Click lawyer registration and assert the existing lawyer form heading appears only when country code is valid. For administration, assert exactly one sign-in link to `/ar/login/admin`, no registration button, and no user/lawyer fields.

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm --dir apps/legal-sos-website vitest run test/separated-auth-portals.test.tsx`

Expected: FAIL because the focused components are absent.

- [ ] **Step 3: Implement `LawyerAccessPortal`**

Render a lawyer-only heading, description, provider-login link, and registration button. Keep registration hidden until requested. Mount `LawyerRegistrationFlow` only when `site.countriesLoading` is false and `/^[A-Z]{2}$/` matches `site.country.code`; otherwise show the existing loading/unavailable message. Keep a back link to the gateway.

- [ ] **Step 4: Implement `AdminAccessPortal`**

Render the administration title, explanation, one external sign-in link, and a back link. Do not render any registration action or authentication form.

- [ ] **Step 5: Mount the dedicated components and run tests**

Run:

```bash
pnpm --dir apps/legal-sos-website vitest run test/separated-auth-portals.test.tsx test/lawyer-registration.test.ts
pnpm --dir apps/legal-sos-website typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/legal-sos-website/components/LawyerAccessPortal.tsx apps/legal-sos-website/components/AdminAccessPortal.tsx apps/legal-sos-website/app/'[locale]'/portal/lawyer apps/legal-sos-website/app/'[locale]'/portal/admin apps/legal-sos-website/test/separated-auth-portals.test.tsx
git commit -m "feat: separate lawyer and admin access"
```

---

### Task 4: Responsive styling, regression suite, and production verification

**Files:**
- Modify: `apps/legal-sos-website/app/globals.css`
- Modify: `apps/legal-sos-website/test/i18n.test.ts`
- Modify: `apps/legal-sos-website/test/separated-auth-portals.test.tsx`
- Create: `apps/legal-sos-website/docs/release/2026-09-24-separated-auth-portals-verification.md`

**Interfaces:**
- Produces: responsive gateway/access-card styles without role-tab selectors.
- Produces: an evidence record separating local tests, build, deployment, and browser checks.

- [ ] **Step 1: Write failing translation and accessibility assertions**

Assert all three dictionaries expose non-empty gateway labels. Assert each page has one role-specific level-one heading, visible back navigation, and no nested interactive controls.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm --dir apps/legal-sos-website vitest run test/i18n.test.ts test/separated-auth-portals.test.tsx`

Expected: FAIL until all copy and semantics are complete.

- [ ] **Step 3: Add responsive styles and complete copy**

Add `.portal-gateway`, `.portal-gateway-grid`, `.portal-access-card`, and `.portal-back-link` rules. Use one column below 720px and three gateway columns when space permits. Remove obsolete `.portal-role-*` rules after verifying no remaining consumers.

- [ ] **Step 4: Run the full local verification**

Run:

```bash
pnpm --dir apps/legal-sos-website test
pnpm --dir apps/legal-sos-website typecheck
pnpm --dir apps/legal-sos-website build
git diff --check
```

Expected: all tests pass, typecheck passes, production build succeeds, and no whitespace errors.

- [ ] **Step 5: Browser-check all four routes**

At 390x844 and desktop width, verify `/ar/portal`, `/ar/portal/client`, `/ar/portal/lawyer`, and `/ar/portal/admin`. Confirm each route contains only its own actions, back navigation works, no console error appears, and lawyer registration waits for country loading.

- [ ] **Step 6: Record evidence and commit**

Document exact test counts, build result, browser outcomes, and any remaining external-auth limitation in the release verification file, then commit:

```bash
git add apps/legal-sos-website/app/globals.css apps/legal-sos-website/lib/translations apps/legal-sos-website/test apps/legal-sos-website/docs/release/2026-09-24-separated-auth-portals-verification.md
git commit -m "test: verify separated LegalSOS auth portals"
```
