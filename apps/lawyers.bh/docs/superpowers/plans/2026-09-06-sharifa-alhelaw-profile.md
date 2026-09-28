# Sharifa Alhelaw Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Sharifa Alhelaw directly after Dana Tariq on the bilingual About page with the approved 8K portrait and Dana's experience/tasks.

**Architecture:** Extend the existing section III data structure with one featured member; the existing About renderer will display it without component changes. Protect the content and placement with the focused Vitest suite and add the approved image as a static asset.

**Tech Stack:** Next.js, TypeScript, Vitest, static PNG assets

## Global Constraints

- Use `Sharifa Alhelaw` / `شريفة الحلو`.
- Use `Legal Advisor to the CEO` / `المستشار القانوني للرئيس التنفيذي`.
- Use `More than 4 years` / `أكثر من 4 سنوات`.
- Use `Law Office of Attorney Mr. Diaa Khalaf` / `مكتب المحامي / السيد ضياء خلف`.
- Copy Dana Tariq's bilingual `previousExperience` and `tasks` exactly.
- Use the approved original 8K portrait without the later highlighter edit.
- Do not alter existing profiles or deploy the site.

---

### Task 1: Add and verify Sharifa's profile

**Files:**
- Modify: `app/[locale]/about/team-data.test.ts`
- Modify: `app/[locale]/about/team-data.ts`
- Create: `public/images/team/sharifa-alhelaw.png`

**Interfaces:**
- Consumes: section III's existing `members` array and the About renderer's existing member shape.
- Produces: one featured member using `/images/team/sharifa-alhelaw.png`.

- [ ] **Step 1: Write the failing test**

Add a test that finds Dana, selects the next member, and asserts Sharifa's exact bilingual title/name, `featured: true`, image path, experience, employer, and equality with Dana's `previousExperience` and `tasks`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm vitest run 'app/[locale]/about/team-data.test.ts'`

Expected: FAIL because no member exists immediately after Dana.

- [ ] **Step 3: Add the approved static image**

Copy `/Users/hma/Documents/Codex/2026-09-06/hf-2/outputs/professional-portrait-8k.png` to `public/images/team/sharifa-alhelaw.png` without modifying the source or existing team images. Verify it remains 7680 by 7680 pixels.

- [ ] **Step 4: Add the minimal profile data**

Insert Sharifa directly after Dana in section III with the exact content in Global Constraints. Duplicate Dana's bilingual experience and task arrays verbatim so the existing renderer requires no changes.

- [ ] **Step 5: Run focused verification**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm vitest run 'app/[locale]/about/team-data.test.ts'`

Expected: PASS with zero failed tests.

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 6: Review the scoped diff**

Confirm only the approved profile data, focused test, and new portrait were added; retain the unrelated existing `apps/lawyers.bh/lib/saraya/` worktree change.
