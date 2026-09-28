# Eman Al Natai Profile Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Eman Al Natai to the existing bilingual Legal & Strategic Management card grid with her supplied portrait and complete profile data.

**Architecture:** Extend the existing typed `execSections` data source with one member object so the existing About-page renderer produces the card without layout changes. Store the portrait alongside current team assets and reference it from the new member entry.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Next Image.

## Global Constraints

- Use the same card design and grid as existing Legal & Strategic Management members.
- Arabic name is `إيمان النطعي`; English name is `Eman Al Natai`.
- Role is `المستشار القانوني للرئيس التنفيذي` / `Legal Advisor to the CEO`.
- Do not alter existing profiles, ordering, layout, or unrelated About-page content.
- Do not deploy without separate approval.

---

### Task 1: Add the bilingual member data and portrait

**Files:**
- Create: `apps/lawyers.bh/app/[locale]/about/team-data.test.ts`
- Modify: `apps/lawyers.bh/app/[locale]/about/team-data.ts`
- Create: `apps/lawyers.bh/public/images/team/eman-al-natai.png`

**Interfaces:**
- Consumes: the existing exported `execSections: ExecSection[]` data structure.
- Produces: one `ExecMember` named `Eman Al Natai` in section III with a valid `/images/team/eman-al-natai.png` photo path and complete bilingual `bio` data.

- [ ] **Step 1: Write the failing profile-data test**

Create a Vitest test that finds section III and asserts the member name, role, photo path, eight Arabic and English experience entries, `More than 5 years`, the previous employer, and seven current duties.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm --filter lawyers.bh test -- 'app/[locale]/about/team-data.test.ts'`

Expected: FAIL because `Eman Al Natai` is absent.

- [ ] **Step 3: Add the minimal member object**

Append one featured member to section III. Use corrected Arabic punctuation, `مكتب فاطمة خليفة وشركاؤها`, a faithful English translation, and the exact supplied duties.

- [ ] **Step 4: Add the supplied image asset**

Copy `/Users/hma/Downloads/1C9C2DF0-39E4-4240-98D6-2F4AEA40999D.PNG` to `apps/lawyers.bh/public/images/team/eman-al-natai.png` without editing the portrait.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `pnpm --filter lawyers.bh test -- 'app/[locale]/about/team-data.test.ts'`

Expected: PASS.

- [ ] **Step 6: Verify the application**

Run:

```bash
pnpm --filter lawyers.bh lint
pnpm --filter lawyers.bh exec tsc --noEmit --incremental false
pnpm --filter lawyers.bh build:next-only
```

Expected: all commands exit successfully; `/ar/about` and `/en/about` remain buildable.

- [ ] **Step 7: Commit the implementation**

```bash
git add -- 'apps/lawyers.bh/app/[locale]/about/team-data.ts' 'apps/lawyers.bh/app/[locale]/about/team-data.test.ts' 'apps/lawyers.bh/public/images/team/eman-al-natai.png'
git commit -m "feat(lawyers-bh): add Eman Al Natai profile"
```
