# CODEZY Technical Operator Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CODEZY FOR TECH SOLUTIONS as a second bilingual organisation card in the existing Technical Operator section.

**Architecture:** Extend section IV in the existing typed `execSections` data source with one `Organization` member. The current About-page renderer will reuse the established card layout without component or styling changes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest.

## Global Constraints

- Keep the existing GULF INTERNATIONAL Company card unchanged.
- Use `CODEZY FOR TECH SOLUTIONS` and `كودزي لحلول التقنية` exactly.
- Reuse the existing bilingual technical-operator title and duties.
- Do not change layout, section order, or unrelated content.
- Do not deploy without separate approval.

---

### Task 1: Add the CODEZY organisation card

**Files:**
- Modify: `apps/lawyers.bh/app/[locale]/about/team-data.test.ts`
- Modify: `apps/lawyers.bh/app/[locale]/about/team-data.ts`

**Interfaces:**
- Consumes: exported `execSections: ExecSection[]`.
- Produces: a second section-IV member with `schemaType: "Organization"`, the exact bilingual trade name, and the four existing bilingual technical duties.

- [ ] **Step 1: Write a failing test**

Add a Vitest case that locates section IV, verifies the original organisation is still present, and asserts the complete CODEZY member object using literal expected values.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter lawyers.bh test -- 'app/[locale]/about/team-data.test.ts'`

Expected: FAIL because CODEZY is absent.

- [ ] **Step 3: Add the minimal member object**

Append the CODEZY organisation to section IV with the exact names, existing operator titles, and the four approved duties in Arabic and English.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm --filter lawyers.bh test -- 'app/[locale]/about/team-data.test.ts'`

Expected: all tests pass.

- [ ] **Step 5: Verify changed files**

Run:

```bash
pnpm --filter lawyers.bh exec eslint 'app/[locale]/about/team-data.ts' 'app/[locale]/about/team-data.test.ts'
pnpm --filter lawyers.bh build:next-only
```

Expected: focused lint succeeds. Record any pre-existing build blocker separately without changing unrelated code.

- [ ] **Step 6: Commit**

```bash
git add -- 'apps/lawyers.bh/app/[locale]/about/team-data.ts' 'apps/lawyers.bh/app/[locale]/about/team-data.test.ts'
git commit -m "feat(lawyers-bh): add CODEZY operator profile"
```
