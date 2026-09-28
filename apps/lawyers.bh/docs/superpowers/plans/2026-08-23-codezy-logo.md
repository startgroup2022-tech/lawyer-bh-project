# CODEZY Card Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the approved CODEZY symbol as a transparent square logo and display it on the existing CODEZY technical-operator card.

**Architecture:** Produce one project-local PNG asset from the supplied raster source, then add the asset path to the existing typed CODEZY member object. The About page's current card image renderer handles display without component changes.

**Tech Stack:** PNG image asset, Next.js 16, Next Image, TypeScript, Vitest.

## Global Constraints

- Preserve only the original pink, cyan, and purple symbol.
- Remove the wordmark, registered mark, white canvas, and all unrelated content.
- Use a square transparent PNG with modest even padding.
- Do not change CODEZY data, duties, placement, or other operator cards.
- Do not deploy without separate approval.

---

### Task 1: Add and connect the CODEZY logo

**Files:**
- Modify: `apps/lawyers.bh/app/[locale]/about/team-data.test.ts`
- Modify: `apps/lawyers.bh/app/[locale]/about/team-data.ts`
- Create: `apps/lawyers.bh/public/images/team/codezy-logo.png`

**Interfaces:**
- Consumes: source image `/Users/hma/Downloads/ceck.png` and the existing CODEZY `ExecMember`.
- Produces: transparent PNG `/images/team/codezy-logo.png` referenced by the member's optional `photo` field.

- [ ] **Step 1: Write the failing test**

Update the CODEZY member expectation with `photo: "/images/team/codezy-logo.png"`.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter lawyers.bh test -- 'app/[locale]/about/team-data.test.ts'`

Expected: FAIL because the CODEZY member has no `photo` field.

- [ ] **Step 3: Extract and validate the logo asset**

Use the approved source as the edit target, isolate only the left symbol, remove the background, save the transparent square PNG at the specified project path, and verify alpha, transparent corners, and subject bounds.

- [ ] **Step 4: Connect the asset**

Add `photo: "/images/team/codezy-logo.png"` to the existing CODEZY member only.

- [ ] **Step 5: Verify GREEN and lint**

Run:

```bash
pnpm --filter lawyers.bh test -- 'app/[locale]/about/team-data.test.ts'
pnpm --filter lawyers.bh exec eslint 'app/[locale]/about/team-data.ts' 'app/[locale]/about/team-data.test.ts'
```

Expected: all tests and focused lint pass.

- [ ] **Step 6: Commit**

```bash
git add -- 'apps/lawyers.bh/app/[locale]/about/team-data.ts' 'apps/lawyers.bh/app/[locale]/about/team-data.test.ts' 'apps/lawyers.bh/public/images/team/codezy-logo.png'
git commit -m "feat(lawyers-bh): add CODEZY card logo"
```
