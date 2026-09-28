# LegalSOS Website Visual Polish Implementation Plan

> **For agentic workers:** Implement this plan task-by-task with test-first behavior changes and fresh verification after each task.

**Goal:** Polish the LegalSOS landing page, phone showcase, supported-country dialog, SOS phone control, and lawyer-registration fields without changing the header, business logic, content, or external state.

**Architecture:** Keep the current React component boundaries and SiteProvider data flow. Add only presentational metadata and accessibility state to CountryGate, then implement the remaining design through scoped CSS and existing markup hooks. Preserve all current uncommitted footer and terms changes.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS/CSS Modules, Vitest, Testing Library, Node 22.

## Global Constraints

- Do not modify `components/Header.tsx`.
- Do not change request, authentication, payment, dispatch, country-loading, or registration APIs.
- Do not add, remove, or enable countries.
- Preserve the current uncommitted footer email and eFada changes.
- Do not commit, push, deploy, or publish.
- Keep RTL, LTR, keyboard access, reduced motion, and responsive behavior.

---

### Task 1: Country Selection Semantics and Presentation

**Files:**
- Modify: `test/site-countries.test.tsx`
- Modify: `components/CountryGate.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `CountryConfig.code`, `CountryConfig.names`, `CountryConfig.dialCode`, and `SiteProvider.country`.
- Produces: country option buttons with `aria-pressed`, a generated flag, localized name, ISO code, and dialing code.

- [ ] **Step 1: Write the failing component test**

Extend the existing menu test with literal expectations:

```tsx
const bahrainOption = await screen.findByRole("button", { name: /Bahrain.*BH.*\+973/i });
const saudiOption = screen.getByRole("button", { name: /Saudi Arabia.*SA.*\+966/i });
expect(bahrainOption).toHaveAttribute("aria-pressed", "true");
expect(saudiOption).toHaveAttribute("aria-pressed", "false");
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter legal-sos-website test -- test/site-countries.test.tsx`

Expected: FAIL because country buttons do not yet expose dialing-code labels or selected state.

- [ ] **Step 3: Implement the minimal semantic markup**

Add a local flag helper and render each option as:

```tsx
<button aria-pressed={site.country.code === country.code}>
  <span className="country-flag" aria-hidden="true">{countryFlag(country.code)}</span>
  <span className="country-option-copy"><strong>{country.names[locale]}</strong><small>{country.code} · {country.dialCode}</small></span>
  <Check aria-hidden="true" />
</button>
```

Preserve the existing `site.setCountry(country.code)` callback.

- [ ] **Step 4: Style the country dialog**

Update `app/globals.css` with larger cards, quiet selected-state glow, logical spacing, generated flag presentation, and mobile-safe one-column layout. Do not change the header country trigger styles.

- [ ] **Step 5: Run the focused test and confirm GREEN**

Run the same focused test command and require zero failures.

---

### Task 2: Section Blending and Three-Phone Composition

**Files:**
- Modify: `app/globals.css`
- Modify only if necessary: `components/LandingSections.tsx`

**Interfaces:**
- Consumes: existing `.hero-section`, `.section-block`, `.app-gallery-track`, `.app-screen-card`, and `.phone-frame` markup.
- Produces: soft visual transitions and a responsive three-device composition without changing content or actions.

- [ ] **Step 1: Remove hard landing-page separators**

Replace visible hero and teaser borders with pseudo-element gradient fades. Give landing sections positioned gradient layers with `pointer-events: none` and keep content above them with local stacking context.

- [ ] **Step 2: Build the desktop phone composition**

Use the existing three mapped `.app-screen-card` elements. Make the second card larger and forward, rotate the first and third inward, add a device shell and inner highlight, and place a soft navy/gold glow behind the group.

- [ ] **Step 3: Preserve mobile usability**

At the mobile breakpoint, restore a horizontal snap track, consistent card widths, readable captions, and no viewport overflow. Keep the quick-flow content stacked after the gallery.

- [ ] **Step 4: Add reduced-motion coverage**

Disable new transform transitions under `prefers-reduced-motion: reduce` while retaining the static composition.

- [ ] **Step 5: Run static checks for this task**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter legal-sos-website typecheck`

Expected: PASS with no TypeScript errors.

---

### Task 3: SOS Phone Control and Comparable Form Fields

**Files:**
- Modify: `components/SosFlow.module.css`
- Modify: `components/LawyerRegistrationFlow.module.css`

**Interfaces:**
- Consumes: existing `SosDialog` phone-country control and existing lawyer-registration inputs.
- Produces: unified segmented input styling, focus treatment, menu rows, form surfaces, and disabled states. No stored values or validation rules change.

- [ ] **Step 1: Polish the SOS phone field**

Style `.phoneField`, `.phoneCountry`, `.phoneMenu`, and `.phoneOptions` as a single segmented control with a restrained gradient surface, clear `:focus-within`, selected country row, and mobile-safe menu height.

- [ ] **Step 2: Align SOS fields and actions**

Give text inputs, textareas, case cards, checkboxes, and buttons consistent radii, surface contrast, shadows, and disabled states without changing selectors or component logic.

- [ ] **Step 3: Align lawyer registration fields**

Update the registration module with the same border, focus, surface, file-input, step, and action language. Keep the international phone value and existing validation unchanged.

- [ ] **Step 4: Run focused request and registration tests**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter legal-sos-website test -- test/lawyer-registration.test.ts test/sos-schema.test.ts`

Expected: PASS with no behavior regression.

---

### Task 4: Full Verification and Local Preview

**Files:**
- Verify: all modified LegalSOS website files.
- Create local screenshots only as temporary QA artifacts when needed; do not add them to Git.

**Interfaces:**
- Consumes: completed Tasks 1-3.
- Produces: verified local Arabic desktop and mobile previews left open for user review.

- [ ] **Step 1: Run the complete verification set**

Run with Node 22:

```bash
pnpm --filter legal-sos-website test
pnpm --filter legal-sos-website typecheck
pnpm --filter legal-sos-website lint
pnpm --filter legal-sos-website build
git diff --check -- apps/legal-sos-website
```

- [ ] **Step 2: Start the local site**

Run `pnpm --filter legal-sos-website dev` on an available local port, without production credentials or deployment commands.

- [ ] **Step 3: Review desktop and mobile in a real browser**

Verify Arabic desktop and 390 px mobile layouts, the phone composition, the supported-country dialog, the SOS phone country menu, keyboard focus, and absence of horizontal overflow.

- [ ] **Step 4: Leave the preview open**

Keep the local browser tab visible for the user. Report local URL and verification evidence separately from any future deployment status.
