# Directory Detail Image Ratio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the directory detail portrait use the listing card's 96:110 crop ratio while retaining a 176-pixel display width.

**Architecture:** Add a small pure sizing helper that derives height from the established listing ratio, test it independently, and consume it in the existing detail page portrait wrapper. The listing card and image fitting behavior remain unchanged.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Vitest

## Global Constraints

- Keep the detail portrait width at 176 pixels.
- Derive a 202-pixel height from the listing card's 96:110 ratio.
- Retain `object-cover`, border, rounded corners, fallback avatar, and responsive placement.
- Do not modify the directory listing card.
- Preserve unrelated Saraya worktree changes.

---

### Task 1: Match the detail portrait crop ratio

**Files:**
- Create: `app/[locale]/directory/directory-portrait.ts`
- Create: `app/[locale]/directory/directory-portrait.test.ts`
- Modify: `app/[locale]/directory/[slug]/page.tsx`

**Interfaces:**
- Produces: `getDirectoryDetailPortraitSize(width?: number): { width: number; height: number }`.
- Consumes: the detail page portrait wrapper uses the returned width and height as inline dimensions.

- [ ] **Step 1: Write the failing test**

Assert that `getDirectoryDetailPortraitSize()` returns `{ width: 176, height: 202 }` and that an explicit width of `96` returns `{ width: 96, height: 110 }`.

- [ ] **Step 2: Run the focused test and confirm RED**

Run `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm vitest run 'app/[locale]/directory/directory-portrait.test.ts'` and confirm it fails because the helper does not exist.

- [ ] **Step 3: Add the minimal sizing helper**

Implement `Math.round(width * 110 / 96)` with a default width of 176.

- [ ] **Step 4: Apply the size to the detail portrait**

Replace the square `h-44 w-44` wrapper with the computed inline width and height. Keep every other wrapper and `Image` property unchanged.

- [ ] **Step 5: Verify GREEN and inspect the UI**

Run the focused Vitest file and `git diff --check`. Open real Arabic and English lawyer detail routes at desktop and mobile widths and confirm that the full 96:110 crop is retained without reducing the 176-pixel width.

- [ ] **Step 6: Commit only scoped files**

Commit the helper, its test, the detail page, and this plan. Leave all unrelated Saraya files untouched and uncommitted.
