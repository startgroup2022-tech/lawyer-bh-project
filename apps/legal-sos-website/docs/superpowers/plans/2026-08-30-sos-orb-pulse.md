# LegalSOS Website SOS Orb Pulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the website hero SOS orb to the Flutter app's continuous four-ring pulse while preserving its existing behavior and responsive/RTL layout.

**Architecture:** Keep the existing interactive button and provider call unchanged. Add presentation-only ring markup around the button and drive the app-matched 1600 ms staggered expansion/fade entirely through scoped CSS, including a reduced-motion fallback.

**Tech Stack:** React 19, Next.js 16, TypeScript, CSS, Vitest, Testing Library

## Global Constraints

- Use one continuously repeating 1600 ms linear cycle.
- Render four rings with normalized delays of 0, 0.18, 0.36, and 0.54.
- Keep the existing 190 px desktop orb and 150 px mobile orb.
- Preserve `site.openSos()`, the localized accessible label, responsive behavior, and RTL behavior.
- Show only `SOS` inside the orb; do not show the selected country there.
- Use the app's red hue at 24% opacity so the translucent fill remains visibly red over the website's darker hero image.
- Add no dependencies and do not change SOS request data, APIs, translations, or dialog behavior.
- Decorative rings must not receive pointer events and must be hidden from assistive technology.
- Respect `prefers-reduced-motion: reduce`.

---

### Task 1: App-matched SOS pulse

**Files:**
- Modify: `apps/legal-sos-website/components/Hero.tsx`
- Modify: `apps/legal-sos-website/app/globals.css`
- Create: `apps/legal-sos-website/test/hero-sos.test.tsx`

**Interfaces:**
- Consumes: `useSite().openSos()` and `useSite().sosOpen` from `components/providers/SiteProvider.tsx`.
- Produces: A `.sos-orb-stage` presentation wrapper, four `.sos-pulse-ring` decorative elements, and the unchanged `.sos-orb` interactive button.

- [ ] **Step 1: Write the failing interaction and ring test**

Render `Hero` inside `SiteProvider` with a small observer component that exposes `sosOpen`. Query the button by its localized accessible name, assert that the stage contains exactly four `[aria-hidden="true"]` ring elements, click the button, and assert that the observer changes from closed to open. This test catches removal of a ring, an accessible decorative ring, or a wrapper that breaks the existing click path.

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "@/components/Hero";
import { SiteProvider, useSite } from "@/components/providers/SiteProvider";
import { getDictionary } from "@/lib/i18n";

function SosStateObserver() {
  return <output aria-label="SOS dialog state">{useSite().sosOpen ? "open" : "closed"}</output>;
}

describe("Hero SOS orb", () => {
  it("renders four decorative pulse rings without breaking the SOS action", () => {
    const dictionary = getDictionary("en");
    const { container } = render(
      <SiteProvider>
        <Hero locale="en" dictionary={dictionary} />
        <SosStateObserver />
      </SiteProvider>,
    );

    const button = screen.getByRole("button", { name: dictionary.hero.sos });
    expect(container.querySelectorAll(".sos-pulse-ring[aria-hidden='true']")).toHaveLength(4);
    expect(screen.getByLabelText("SOS dialog state")).toHaveTextContent("closed");

    fireEvent.click(button);

    expect(screen.getByLabelText("SOS dialog state")).toHaveTextContent("open");
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm --filter legal-sos-website test -- test/hero-sos.test.tsx`

Expected: FAIL because `.sos-pulse-ring` elements do not exist; the expected count is four and the received count is zero.

- [ ] **Step 3: Add minimal ring markup without changing the click handler**

Wrap the existing button in `.sos-orb-stage`. Insert four empty spans before the button, each with `className="sos-pulse-ring"`, `aria-hidden="true"`, and a ring modifier class from `sos-pulse-ring--1` through `sos-pulse-ring--4`. Keep the button's `onClick`, `aria-label`, text, and country label unchanged.

- [ ] **Step 4: Implement the app-matched animation and responsive sizing**

Define `.sos-orb-stage` as a centered, isolated 190 px square. Absolutely center non-interactive ring elements behind the button. Use a 1600 ms infinite linear keyframe that expands each ring from the orb edge to its configured maximum scale while fading from 0.42 to zero. Give the four ring modifiers staggered negative delays equivalent to 0, 0.18, 0.36, and 0.54 of the cycle and use progressively smaller maximum scales matching the Flutter layer ordering. Update `.sos-orb` to a translucent red fill, subtle gold border, and red/gold glow while keeping its size and hover scale. In the existing mobile media query, change only the stage and orb size variables to 150 px. Add a reduced-motion media query that disables animation and shows a quiet static ring.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `pnpm --filter legal-sos-website test -- test/hero-sos.test.tsx`

Expected: PASS with one test and no failures.

- [ ] **Step 6: Run full verification**

Run from `/Users/hma/lawyers.bh`:

```bash
pnpm --filter legal-sos-website test
pnpm --filter legal-sos-website typecheck
pnpm --filter legal-sos-website lint
pnpm --filter legal-sos-website build
git diff --check -- apps/legal-sos-website
git status --short -- apps/legal-sos-website
```

Expected: all four project checks exit 0, `git diff --check` prints no errors, and scoped status lists only the design, plan, hero component, stylesheet, and hero SOS test created or modified by this work.

- [ ] **Step 7: Commit the implementation**

```bash
git add apps/legal-sos-website/components/Hero.tsx apps/legal-sos-website/app/globals.css apps/legal-sos-website/test/hero-sos.test.tsx apps/legal-sos-website/docs/superpowers/specs/2026-08-30-sos-orb-pulse-design.md apps/legal-sos-website/docs/superpowers/plans/2026-08-30-sos-orb-pulse.md
git commit -m "feat(legal-sos): match app SOS pulse"
```
