# LegalSOS Terms and Privacy Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an indexable Arabic, English, and Turkish LegalSOS terms and privacy page suitable for the App Store privacy-policy URL.

**Architecture:** Store localized legal-page content in one typed module, render it through a server page at `app/[locale]/terms/page.tsx`, and integrate localized links into the existing footer and SOS consent control. Reuse the website's locale helpers and visual tokens without adding dependencies.

**Tech Stack:** Next.js 16.2.2, React 19.2.4, TypeScript 5, CSS, Vitest 4.1.10, Testing Library.

## Global Constraints

- Legal owner: `GULF INTERNATIONAL COLLECTION AND CONSULTING CO. W.L.L`.
- Routes: `/ar/terms`, `/en/terms`, and `/tr/terms`.
- Arabic is RTL; English and Turkish are LTR.
- The page must identify LegalSOS as an intermediary and not a government emergency service.
- The page must not promise confidentiality or security beyond implemented behavior.
- Preserve request submission, authentication, payment, and location behavior.
- Do not deploy or change DNS as part of this plan.

---

### Task 1: Localized legal content and public page

**Files:**
- Create: `apps/legal-sos-website/lib/terms-content.ts`
- Create: `apps/legal-sos-website/app/[locale]/terms/page.tsx`
- Modify: `apps/legal-sos-website/app/globals.css`
- Test: `apps/legal-sos-website/test/terms-page.test.tsx`

**Interfaces:**
- Consumes: `Locale`, `isLocale`, and `getDirection` from `@/lib/i18n`.
- Produces: `getTermsContent(locale: Locale): TermsContent` and the localized `/[locale]/terms` page.

- [ ] **Step 1: Write the failing content and page tests**

```tsx
expect(getTermsContent("ar").owner).toBe(
  "GULF INTERNATIONAL COLLECTION AND CONSULTING CO. W.L.L",
);
expect(JSON.stringify(getTermsContent("ar"))).not.toContain("ساريا سكوير");
expect(getTermsContent("en").sections.map((section) => section.key)).toContain("privacy");
expect(getTermsContent("tr").sections.map((section) => section.key)).toContain("location-notifications");
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm --filter legal-sos-website test -- test/terms-page.test.tsx`

Expected: FAIL because `@/lib/terms-content` does not exist.

- [ ] **Step 3: Implement the typed localized content**

```ts
export type TermsSectionKey =
  | "acceptance"
  | "service-nature"
  | "privacy"
  | "data"
  | "location-notifications"
  | "sharing"
  | "payments"
  | "accounts"
  | "limitations"
  | "retention-rights"
  | "law"
  | "changes-contact";

export interface TermsContent {
  title: string;
  subtitle: string;
  lastUpdated: string;
  owner: string;
  back: string;
  sections: readonly { key: TermsSectionKey; heading: string; body: string }[];
}

export function getTermsContent(locale: Locale): TermsContent;
```

Write complete Arabic, English, and Turkish copy for every section. Use `info@legalsos.com` for contact and Bahrain law for governing law.

- [ ] **Step 4: Implement the server-rendered page and metadata**

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const content = getTermsContent(locale);
  return { title: content.title, description: content.subtitle };
}
```

Render a localized home link, owner, updated date, and all sections. Call `notFound()` for an unsupported locale.

- [ ] **Step 5: Add responsive legal-page styles**

Add `.legal-page`, `.legal-header`, `.legal-document`, and `.legal-section` rules using existing CSS variables. Keep the content width at `860px`, use `padding-inline: 24px`, and add a `@media (max-width: 640px)` rule with smaller heading and section spacing.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `pnpm --filter legal-sos-website test -- test/terms-page.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit Task 1 files**

```bash
git add apps/legal-sos-website/lib/terms-content.ts apps/legal-sos-website/app/'[locale]'/terms/page.tsx apps/legal-sos-website/app/globals.css apps/legal-sos-website/test/terms-page.test.tsx
git commit -m "feat(legal-sos): add multilingual terms page"
```

### Task 2: Footer and SOS consent integration

**Files:**
- Modify: `apps/legal-sos-website/lib/translations/ar.ts`
- Modify: `apps/legal-sos-website/lib/translations/en.ts`
- Modify: `apps/legal-sos-website/lib/translations/tr.ts`
- Modify: `apps/legal-sos-website/components/LandingSections.tsx`
- Modify: `apps/legal-sos-website/components/SosDialog.tsx`
- Modify: `apps/legal-sos-website/app/globals.css`
- Test: `apps/legal-sos-website/test/terms-links.test.tsx`

**Interfaces:**
- Consumes: localized route `/${locale}/terms` produced by Task 1.
- Produces: `dictionary.footer.terms` and `dictionary.sos.termsLink` displayed as localized links.

- [ ] **Step 1: Write failing localized-link tests**

```tsx
render(<LandingSections locale="ar" dictionary={getDictionary("ar")} />);
expect(screen.getByRole("link", { name: "الشروط وسياسة الخصوصية" })).toHaveAttribute(
  "href",
  "/ar/terms",
);

render(<SosDialog locale="en" dictionary={getDictionary("en")} />);
expect(screen.getByRole("link", { name: "Privacy Policy and Terms" })).toHaveAttribute(
  "href",
  "/en/terms",
);
```

- [ ] **Step 2: Run focused test and verify RED**

Run: `pnpm --filter legal-sos-website test -- test/terms-links.test.tsx`

Expected: FAIL because the localized links do not exist.

- [ ] **Step 3: Add localized link labels**

Add these keys consistently to all dictionaries:

```ts
sos: { termsLink: "الشروط وسياسة الخصوصية" }
footer: { terms: "الشروط وسياسة الخصوصية" }
```

Use `Privacy Policy and Terms` in English and `Gizlilik Politikası ve Koşullar` in Turkish.

- [ ] **Step 4: Add the footer link**

```tsx
<Link href={`/${locale}/terms`}>{dictionary.footer.terms}</Link>
```

Place it with the footer's quick links.

- [ ] **Step 5: Link consent without changing checkbox behavior**

Split the consent label into plain localized consent text and a nested link. The link must stop click propagation so navigating does not toggle `acceptedTerms`.

```tsx
<Link href={`/${locale}/terms`} onClick={(event) => event.stopPropagation()}>
  {dictionary.sos.termsLink}
</Link>
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `pnpm --filter legal-sos-website test -- test/terms-links.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit Task 2 files**

```bash
git add apps/legal-sos-website/lib/translations apps/legal-sos-website/components/LandingSections.tsx apps/legal-sos-website/components/SosDialog.tsx apps/legal-sos-website/app/globals.css apps/legal-sos-website/test/terms-links.test.tsx
git commit -m "feat(legal-sos): link terms from public flows"
```

### Task 3: Full verification and visual QA

**Files:**
- Modify only if verification exposes a feature defect, with a failing test first.
- Create: `apps/legal-sos-website/design-qa-terms-mobile.png`
- Create: `apps/legal-sos-website/design-qa-terms-desktop.png`

**Interfaces:**
- Consumes: the completed page and integrations from Tasks 1 and 2.
- Produces: local readiness evidence without deployment.

- [ ] **Step 1: Run the complete test suite**

Run: `pnpm --filter legal-sos-website test`

Expected: all tests PASS.

- [ ] **Step 2: Run static verification**

Run: `pnpm --filter legal-sos-website typecheck`

Run: `pnpm --filter legal-sos-website lint`

Expected: both commands exit 0.

- [ ] **Step 3: Run the production build**

Run: `pnpm --filter legal-sos-website build`

Expected: build exits 0 and includes `/[locale]/terms`.

- [ ] **Step 4: Visually inspect Arabic mobile and English desktop**

Start the app on port 3004, open `/ar/terms` at 390px width and `/en/terms` at desktop width, verify direction, wrapping, link navigation, and absence of horizontal overflow, then save screenshots at the paths listed above.

- [ ] **Step 5: Inspect the exact diff**

Run: `git diff --check`

Run: `git status --short -- apps/legal-sos-website`

Expected: no whitespace errors and no unrelated files included.

- [ ] **Step 6: Stop before deployment**

Report the verified local route and request explicit approval before deploying or changing the App Store privacy-policy URL.
