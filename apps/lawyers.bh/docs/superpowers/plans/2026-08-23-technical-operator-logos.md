# Technical Operator Logos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display white-background GICC and CODEZY logos fully inside their existing technical-operator cards without changing person portraits.

**Architecture:** Add one GICC asset and replace the CODEZY logo asset with an opaque-white version. Extend the existing team data with the GICC photo path and make `MemberAvatar` choose `object-contain` for `Organization` members while retaining `object-cover` for people.

**Tech Stack:** PNG assets, Next.js 16, Next Image, React 19, TypeScript, Vitest.

## Global Constraints

- Preserve both logos' geometry, colours, text, and proportions.
- Both final logo assets use square solid-white canvases.
- Keep company data, card order, and section layout unchanged.
- Keep person portraits on `object-cover`.
- Do not deploy without separate approval.

---

### Task 1: Add logo contracts and assets

**Files:**
- Modify: `apps/lawyers.bh/app/[locale]/about/team-data.test.ts`
- Modify: `apps/lawyers.bh/app/[locale]/about/team-data.ts`
- Create: `apps/lawyers.bh/public/images/team/gicc-logo.png`
- Modify: `apps/lawyers.bh/public/images/team/codezy-logo.png`

**Interfaces:**
- Consumes: section-IV organisation members and the two supplied source assets.
- Produces: `/images/team/gicc-logo.png` on GULF INTERNATIONAL and opaque-white square assets for both companies.

- [ ] **Step 1: Extend the failing data test**

Assert the existing GULF INTERNATIONAL member has `photo: "/images/team/gicc-logo.png"` while CODEZY retains its approved photo path.

- [ ] **Step 2: Verify RED**

Run the focused team-data test and confirm failure because GICC has no photo path.

- [ ] **Step 3: Prepare both square white assets**

Preserve the complete supplied GICC logo on white. Convert the approved CODEZY symbol asset from transparent to solid white without changing the symbol. Verify both dimensions and opaque white corner pixels.

- [ ] **Step 4: Add the GICC photo path and verify GREEN**

Add only the missing GICC photo field and rerun the focused test.

---

### Task 2: Render organisation logos without cropping

**Files:**
- Modify: `apps/lawyers.bh/app/[locale]/about/Content.tsx`
- Create: `apps/lawyers.bh/app/[locale]/about/member-avatar.test.ts`

**Interfaces:**
- Consumes: `member.schemaType` and the existing `MemberAvatar` props.
- Produces: exported `getMemberAvatarImageFit(schemaType)` returning `object-contain` for `Organization` and `object-cover` otherwise; `MemberAvatar` uses it.

- [ ] **Step 1: Write a failing image-fit test**

Assert the helper returns literal organisation and person fit classes.

- [ ] **Step 2: Verify RED**

Run the focused avatar test and confirm failure because the helper is absent.

- [ ] **Step 3: Implement organisation-aware rendering**

Pass `organization={member.schemaType === "Organization"}` into both `MemberAvatar` call sites, use a white avatar background for organisations, and apply `object-contain p-1` only to their images.

- [ ] **Step 4: Verify GREEN and lint**

Run both focused tests and ESLint on all changed TypeScript/TSX files.

- [ ] **Step 5: Commit**

Stage only the two About-page source files, two tests, and two logo assets; commit as `feat(lawyers-bh): add technical operator logos`.
