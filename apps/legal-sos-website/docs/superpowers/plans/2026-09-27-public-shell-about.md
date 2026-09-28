# LegalSOS Public Shell and About Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a consistent public shell to every LegalSOS public page, including a responsive sticky glass navbar, an accurate site-wide footer, and a localized About page featuring Omar Nabih Shaker from Lawyers.bh.

**Architecture:** Introduce one reusable `PublicSiteShell` that owns the shared provider, header, footer, country gate, and optional SOS dialog. Keep page-specific content isolated, move footer markup out of the landing page, and store About content in the existing locale dictionaries so Arabic, English, and Turkish remain synchronized.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS Modules/global CSS, Vitest, Testing Library.

## Global Constraints

- Preserve the current LegalSOS identity, header content, authentication flows, and route behavior.
- Use Lawyers.bh only as the source for Omar Nabih Shaker's approved name, title, and existing portrait; do not copy its page design.
- Show only Omar Nabih Shaker in the management section.
- Apply the shared footer and navbar to all public pages, including legal pages and portal entry pages.
- Keep touch targets at least 44px and preserve RTL/LTR behavior.
- Respect `prefers-reduced-motion` for scroll and menu transitions.
- Do not deploy, push, or publish during implementation. Run and present a local preview first.

---

## Task 1: Extend the localized public-site contract

**Files:**
- Modify: `apps/legal-sos-website/lib/translations/ar.ts`
- Modify: `apps/legal-sos-website/lib/translations/en.ts`
- Modify: `apps/legal-sos-website/lib/translations/tr.ts`
- Modify: `apps/legal-sos-website/test/i18n.test.ts`
- Create: `apps/legal-sos-website/test/about-content.test.ts`

- [ ] **Step 1: Add failing localization tests**

Add assertions that every dictionary exposes the same keys for the new navbar, footer groups, About sections, Omar card, and CTA.

```ts
for (const locale of ["ar", "en", "tr"] as const) {
  const dictionary = getDictionary(locale);
  expect(dictionary.nav.about).toBeTruthy();
  expect(dictionary.footer.links.about).toBeTruthy();
  expect(dictionary.about.management.member.name).toBeTruthy();
  expect(dictionary.about.management.member.role).toBeTruthy();
}
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: `npm test -- --run test/i18n.test.ts test/about-content.test.ts`

Expected: FAIL because the new translation keys do not exist.

- [ ] **Step 3: Add the minimum localized content**

Extend each dictionary with:

```ts
nav: {
  about: string;
}
footer: {
  description: string;
  links: {
    home: string;
    about: string;
    help: string;
    portal: string;
    lawyerRegister: string;
    services: string;
    howItWorks: string;
    terms: string;
    refundPolicy: string;
  };
}
about: {
  eyebrow: string;
  title: string;
  introduction: string;
  mission: { title: string; body: string };
  vision: { title: string; body: string };
  values: { title: string; items: Array<{ title: string; body: string }> };
  process: { title: string; steps: Array<{ title: string; body: string }> };
  coverage: { title: string; body: string };
  management: {
    title: string;
    member: { name: string; role: string; biography: string };
  };
  cta: { title: string; body: string; primary: string; secondary: string };
}
```

Use `عمر نبيه شاكر` / `Omar Nabih Shaker` and the official role `رئيس مجلس الإدارة والرئيس التنفيذي` / `Chairman & CEO`. Keep Turkish wording professional and equivalent.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run test/i18n.test.ts test/about-content.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the localized contract**

```bash
git add apps/legal-sos-website/lib/translations apps/legal-sos-website/test/i18n.test.ts apps/legal-sos-website/test/about-content.test.ts
git commit -m "feat: add localized public site content"
```

---

## Task 2: Make the existing navbar sticky, compact, and accessible

**Files:**
- Modify: `apps/legal-sos-website/components/Header.tsx`
- Modify: `apps/legal-sos-website/app/globals.css`
- Create: `apps/legal-sos-website/test/header-behavior.test.tsx`

- [ ] **Step 1: Add failing behavior tests**

Cover the existing header content plus the new About link, scroll state, Escape-to-close, outside-click close, and navigation close.

```tsx
render(<Header locale="ar" dictionary={getDictionary("ar")} />);
fireEvent.scroll(window, { target: { scrollY: 64 } });
expect(screen.getByRole("banner")).toHaveClass("is-scrolled");

fireEvent.click(screen.getByRole("button", { name: /القائمة/i }));
fireEvent.keyDown(document, { key: "Escape" });
expect(screen.getByRole("button", { name: /القائمة/i })).toHaveAttribute("aria-expanded", "false");
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- --run test/header-behavior.test.tsx`

Expected: FAIL because scroll and dismissal behavior are missing.

- [ ] **Step 3: Implement the header behavior**

- Keep the current branding and actions unchanged.
- Add the localized About link at `/${locale}/about`.
- Track `window.scrollY > 32` using one passive scroll listener.
- Apply `is-scrolled` to the header when compact mode is active.
- Close the mobile menu after route-link clicks, Escape, and outside clicks.
- Keep focus states visible and button targets at least 44px.

- [ ] **Step 4: Implement the responsive glass styling**

- Default state: current visual height and solid/gradient appearance.
- Scrolled state: reduced vertical padding, translucent dark background, backdrop blur, subtle gold border, and soft shadow.
- Mobile: full-width panel below the header, no horizontal overflow, safe stacking over page content.
- Reduced motion: disable animated shrinking and panel movement.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- --run test/header-behavior.test.tsx test/site-countries.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the navbar change**

```bash
git add apps/legal-sos-website/components/Header.tsx apps/legal-sos-website/app/globals.css apps/legal-sos-website/test/header-behavior.test.tsx
git commit -m "feat: add responsive glass navbar"
```

---

## Task 3: Extract a site-wide localized footer

**Files:**
- Create: `apps/legal-sos-website/components/SiteFooter.tsx`
- Modify: `apps/legal-sos-website/components/LandingSections.tsx`
- Modify: `apps/legal-sos-website/app/globals.css`
- Modify: `apps/legal-sos-website/test/footer-contact.test.tsx`
- Create: `apps/legal-sos-website/test/site-footer.test.tsx`

- [ ] **Step 1: Add failing footer tests**

Assert that the footer renders localized Home, About, Help, Portal, lawyer registration, Terms, and Refund Policy links; displays the support email; and reflects the selected country/dialing code from `SiteProvider`.

```tsx
expect(screen.getByRole("link", { name: dictionary.footer.links.about })).toHaveAttribute(
  "href",
  "/ar/about",
);
expect(screen.getByText(/support@legalsos/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: `npm test -- --run test/footer-contact.test.tsx test/site-footer.test.tsx`

Expected: FAIL because no standalone footer exists.

- [ ] **Step 3: Create `SiteFooter`**

Use `useSite()` for current country data and create four responsive content areas:

1. LegalSOS brand, short description, and eFada identity.
2. Primary navigation links.
3. Service/how-it-works/lawyer registration links.
4. Legal links, support email, country, and dialing code.

End with emergency guidance and localized copyright text.

- [ ] **Step 4: Remove the embedded landing footer**

Delete only the old footer markup from `LandingSections.tsx`; preserve all landing sections and anchors.

- [ ] **Step 5: Add footer styling**

Use a layered dark LegalSOS gradient, soft top transition instead of a hard divider, responsive columns, readable contrast, and clear hover/focus states.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- --run test/footer-contact.test.tsx test/site-footer.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit the footer extraction**

```bash
git add apps/legal-sos-website/components/SiteFooter.tsx apps/legal-sos-website/components/LandingSections.tsx apps/legal-sos-website/app/globals.css apps/legal-sos-website/test/footer-contact.test.tsx apps/legal-sos-website/test/site-footer.test.tsx
git commit -m "feat: add shared LegalSOS footer"
```

---

## Task 4: Introduce the reusable public shell on every public page

**Files:**
- Create: `apps/legal-sos-website/components/PublicSiteShell.tsx`
- Modify: `apps/legal-sos-website/app/[locale]/page.tsx`
- Modify: `apps/legal-sos-website/app/[locale]/help/page.tsx`
- Modify: `apps/legal-sos-website/app/[locale]/portal/page.tsx`
- Modify: `apps/legal-sos-website/app/[locale]/portal/admin/page.tsx`
- Modify: `apps/legal-sos-website/app/[locale]/portal/client/page.tsx`
- Modify: `apps/legal-sos-website/app/[locale]/portal/lawyer/page.tsx`
- Modify: `apps/legal-sos-website/app/[locale]/lawyer/register/page.tsx`
- Modify: `apps/legal-sos-website/app/[locale]/terms/page.tsx`
- Modify: `apps/legal-sos-website/app/[locale]/refund-policy/page.tsx`
- Modify: `apps/legal-sos-website/app/[locale]/sos/continue/page.tsx`
- Create: `apps/legal-sos-website/test/public-site-shell.test.tsx`
- Modify: `apps/legal-sos-website/test/terms-page.test.ts`

- [ ] **Step 1: Add failing shell tests**

Assert that the shell consistently renders the header, children, footer, and country gate, while the SOS dialog remains opt-in.

```tsx
render(
  <PublicSiteShell locale="ar" dictionary={getDictionary("ar")} withSosDialog>
    <main>Page content</main>
  </PublicSiteShell>,
);
expect(screen.getByRole("banner")).toBeInTheDocument();
expect(screen.getByRole("contentinfo")).toBeInTheDocument();
expect(screen.getByText("Page content")).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: `npm test -- --run test/public-site-shell.test.tsx test/terms-page.test.ts`

Expected: FAIL because `PublicSiteShell` does not exist.

- [ ] **Step 3: Create the shell**

```ts
type PublicSiteShellProps = {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
  withSosDialog?: boolean;
};
```

Render `SiteProvider`, `Header`, page content, `SiteFooter`, `CountryGate`, and optional `SosDialog` in that order.

- [ ] **Step 4: Migrate every public route**

Replace page-level duplicated provider/header/footer wrappers with `PublicSiteShell`. Preserve existing page components, metadata, query parameter handling, and authentication behavior.

- [ ] **Step 5: Run route and shell tests**

Run: `npm test -- --run test/public-site-shell.test.tsx test/terms-page.test.ts test/terms-links.test.tsx test/lawyer-onboarding-ui.test.tsx test/portal-role-login.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the public shell**

```bash
git add apps/legal-sos-website/components/PublicSiteShell.tsx apps/legal-sos-website/app apps/legal-sos-website/test/public-site-shell.test.tsx apps/legal-sos-website/test/terms-page.test.ts
git commit -m "refactor: share the public site shell"
```

---

## Task 5: Build the localized About page and Omar profile

**Files:**
- Create: `apps/legal-sos-website/components/AboutPage.tsx`
- Create: `apps/legal-sos-website/components/AboutPage.module.css`
- Create: `apps/legal-sos-website/app/[locale]/about/page.tsx`
- Create: `apps/legal-sos-website/public/images/team/omar-nabih-shaker.jpg`
- Create: `apps/legal-sos-website/test/about-page.test.tsx`

- [ ] **Step 1: Add failing About page tests**

Test Arabic and English rendering for the hero, mission, vision, values, process, regional coverage, Omar's name/title, local portrait path, and CTA links.

```tsx
expect(screen.getByRole("heading", { name: "عمر نبيه شاكر" })).toBeInTheDocument();
expect(screen.getByText("رئيس مجلس الإدارة والرئيس التنفيذي")).toBeInTheDocument();
expect(screen.getByRole("img", { name: "عمر نبيه شاكر" })).toHaveAttribute(
  "src",
  expect.stringContaining("omar-nabih-shaker.jpg"),
);
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- --run test/about-page.test.tsx`

Expected: FAIL because the About page does not exist.

- [ ] **Step 3: Copy the approved portrait locally**

Source: `apps/lawyers.bh/public/images/team/omar-nabih-shaker.jpg`

Destination: `apps/legal-sos-website/public/images/team/omar-nabih-shaker.jpg`

Do not hotlink or modify the source asset.

- [ ] **Step 4: Implement `AboutPage`**

Build the approved sections using semantic headings and cards:

- Hero/introduction.
- Mission and vision.
- Values.
- How LegalSOS works.
- Regional coverage.
- Management section with Omar only.
- CTA to start SOS and register as a lawyer.

Use subtle gradients between sections, no hard separator lines, and responsive layouts that stack cleanly on phones.

- [ ] **Step 5: Add the localized route**

Load the dictionary with the existing locale helpers and render `AboutPage` inside `PublicSiteShell` with the SOS dialog enabled.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- --run test/about-page.test.tsx test/header-behavior.test.tsx test/site-footer.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit the About page**

```bash
git add apps/legal-sos-website/components/AboutPage.tsx apps/legal-sos-website/components/AboutPage.module.css apps/legal-sos-website/app/'[locale]'/about/page.tsx apps/legal-sos-website/public/images/team/omar-nabih-shaker.jpg apps/legal-sos-website/test/about-page.test.tsx
git commit -m "feat: add localized LegalSOS about page"
```

---

## Task 6: Verify the full website locally and present the preview

**Files:**
- Modify only if verification finds a scoped defect in the files above.

- [ ] **Step 1: Run focused regression tests**

Run: `npm test -- --run test/header-behavior.test.tsx test/site-footer.test.tsx test/public-site-shell.test.tsx test/about-page.test.tsx test/lawyer-onboarding-ui.test.tsx test/portal-role-login.test.tsx test/terms-page.test.ts`

Expected: PASS.

- [ ] **Step 2: Run static validation**

Run: `npm run typecheck && npm run lint`

Expected: PASS with no new errors.

- [ ] **Step 3: Run the complete test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 4: Run a production build**

Run: `npm run build`

Expected: PASS and include `/{locale}/about` in the generated routes.

- [ ] **Step 5: Start the local preview**

Run from `apps/legal-sos-website`:

```bash
PORT=3014 npm run dev
```

- [ ] **Step 6: Perform browser QA**

Inspect at minimum:

- `/ar`, `/en`, `/tr`
- `/ar/about`, `/en/about`, `/tr/about`
- `/ar/lawyer/register`
- `/ar/help`
- `/ar/portal`
- `/ar/terms`
- `/ar/refund-policy`

Verify desktop and mobile widths, sticky/shrinking navbar, glass appearance, mobile menu dismissal, footer consistency, no horizontal overflow, correct RTL/LTR layout, Omar portrait, and all links.

- [ ] **Step 7: Present the local preview for user approval**

Open `http://localhost:3014/ar/about` and provide a concise verification summary. Do not deploy, push, or publish until the user explicitly approves the local result.

- [ ] **Step 8: Commit any verification-only fixes**

```bash
git add apps/legal-sos-website
git commit -m "fix: polish LegalSOS public pages"
```

Only create this commit if verification required actual fixes.
