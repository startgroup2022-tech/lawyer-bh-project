# Technical Management Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Habib Mohammed as the bilingual Director of Technical Management on the Lawyers.bh About page, with his portrait, experience, responsibilities, and the approved Eman Al Natai employer correction.

**Architecture:** Extend the existing typed `execSections` data source with a new people-focused section IV and move the existing operator organisations to section V. Reuse the current About-page member renderer and team-image asset path, avoiding component or styling changes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Next Image.

## Global Constraints

- Use `الإدارة التقنية` / `Technical Management` for the new section.
- Use `حبيب محمد` / `Habib Mohammed` and `مدير الإدارة التقنية` / `Director of Technical Management` exactly.
- Show `أكثر من 6 سنوات` / `More than 6 years`; do not add a previous employer.
- Preserve every existing profile, operator organisation, layout, and unrelated About-page string.
- Correct Eman's employer to `مكتب المحامية / فاطمة خليفة وشركاؤها` / `Law Office of Attorney Fatima Khalifa & Partners`.
- Do not deploy without separate approval.

---

### Task 1: Define the bilingual profile behavior in tests

**Files:**
- Modify: `apps/lawyers.bh/app/[locale]/about/team-data.test.ts`

**Interfaces:**
- Consumes: exported `execSections: ExecSection[]`.
- Produces: assertions for section IV, Habib's `ExecMember`, section V operator preservation, and Eman's corrected employer.

- [ ] **Step 1: Write a failing test for the new section and profile**

Add a test that finds section IV, asserts its bilingual heading, and verifies Habib's exact name, title, `/images/team/habib-mohammed.png` photo, `More than 6 years`, absent `previousEmployer`, twelve bilingual `previousExperience` entries, and twelve bilingual `tasks` entries.

- [ ] **Step 2: Extend the existing operator and Eman assertions**

Assert that the technical operators now live in section V and that Eman's employer matches the approved Arabic and English strings.

- [ ] **Step 3: Run the focused test and verify RED**

Run: `pnpm --filter lawyers.bh test -- 'app/[locale]/about/team-data.test.ts'`

Expected: FAIL because section IV is still the operator section, Habib is absent, and Eman's employer strings are unchanged.

### Task 2: Add the technical management data and portrait

**Files:**
- Modify: `apps/lawyers.bh/app/[locale]/about/team-data.ts`
- Create: `apps/lawyers.bh/public/images/team/habib-mohammed.png`

**Interfaces:**
- Consumes: the existing `ExecSection`, `ExecMember`, and `LocalizedText` types.
- Produces: section IV containing Habib's profile and section V containing the unchanged technical operator organisations.

- [ ] **Step 1: Add Habib's section and member object**

Insert section IV immediately before the operator section. Populate `previousExperience`, `yearsOfExperience`, and `tasks` with all exact bilingual items in the approved design spec; omit `previousEmployer`.

- [ ] **Step 2: Renumber the operator section**

Change only the operator section's `roman` value from `IV` to `V`.

- [ ] **Step 3: Correct Eman's employer**

Set the Arabic value to `مكتب المحامية / فاطمة خليفة وشركاؤها` and English value to `Law Office of Attorney Fatima Khalifa & Partners`.

- [ ] **Step 4: Add the supplied portrait**

Copy `/Users/hma/Downloads/632DEC95-AA9C-4BEB-AF21-7A43D2D18CD9.PNG` unchanged to `apps/lawyers.bh/public/images/team/habib-mohammed.png`.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `pnpm --filter lawyers.bh test -- 'app/[locale]/about/team-data.test.ts'`

Expected: PASS.

### Task 3: Verify the complete About-page change

**Files:**
- Verify: `apps/lawyers.bh/app/[locale]/about/team-data.ts`
- Verify: `apps/lawyers.bh/app/[locale]/about/team-data.test.ts`
- Verify: `apps/lawyers.bh/public/images/team/habib-mohammed.png`

**Interfaces:**
- Consumes: completed data and portrait from Tasks 1 and 2.
- Produces: evidence that the focused data contract and application compile successfully.

- [ ] **Step 1: Run focused lint and TypeScript checks**

Run:

```bash
pnpm --filter lawyers.bh exec eslint 'app/[locale]/about/team-data.ts' 'app/[locale]/about/team-data.test.ts'
pnpm --filter lawyers.bh exec tsc --noEmit --incremental false
```

Expected: both commands exit successfully.

- [ ] **Step 2: Run the production build**

Run: `pnpm --filter lawyers.bh build:next-only`

Expected: build exits successfully and includes `/[locale]/about`.

- [ ] **Step 3: Inspect the final diff and working tree**

Confirm the diff contains only the approved profile, section ordering, Eman correction, test coverage, portrait, plan, and spec changes; preserve unrelated user changes.

- [ ] **Step 4: Commit the implementation**

```bash
git add -- 'apps/lawyers.bh/app/[locale]/about/team-data.ts' 'apps/lawyers.bh/app/[locale]/about/team-data.test.ts' 'apps/lawyers.bh/public/images/team/habib-mohammed.png'
git commit -m "feat(lawyers-bh): add technical management profile"
```
