# Habib Mohammed Portrait Crop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Habib Mohammed's full-body About-page portrait with the approved close head-and-shoulders composition.

**Architecture:** Use the existing portrait as the sole edit target and generate a non-destructive candidate that changes only the framing. Visually verify identity and composition before replacing the same project asset path, leaving page code and profile data untouched.

**Tech Stack:** Built-in image editing, PNG, Next Image.

## Global Constraints

- Preserve identity, expression, hair, beard, skin tone, suit, shirt, tie, lighting, and neutral background.
- Use a square head-and-shoulders crop with the full top of the hair visible.
- Match the facial scale of the existing Eman Al Natai portrait.
- Do not add retouching, text, logos, borders, objects, or watermarks.
- Replace only `apps/lawyers.bh/public/images/team/habib-mohammed.png`.
- Do not deploy without separate approval.

---

### Task 1: Create and validate the closer portrait

**Files:**
- Modify: `apps/lawyers.bh/public/images/team/habib-mohammed.png`

**Interfaces:**
- Consumes: the current square full-body portrait and the approved crop design.
- Produces: a square close portrait consumed by the existing `/images/team/habib-mohammed.png` reference.

- [ ] **Step 1: Generate a non-destructive edit candidate**

Use the current portrait as the edit target. Request only a head-and-shoulders reframing with identity and all photographic details locked.

- [ ] **Step 2: Inspect the candidate at original resolution**

Confirm the face is centred, the hair is not clipped, the shoulders and tie remain visible, and identity and appearance are unchanged.

- [ ] **Step 3: Replace the project asset**

Copy the approved candidate over `apps/lawyers.bh/public/images/team/habib-mohammed.png` without changing the consuming TypeScript data.

- [ ] **Step 4: Verify the asset and existing profile contract**

Run:

```bash
file apps/lawyers.bh/public/images/team/habib-mohammed.png
pnpm --filter lawyers.bh test -- 'app/[locale]/about/team-data.test.ts'
git diff --check
```

Expected: a valid square raster image, all About-page tests pass, and no whitespace errors.

- [ ] **Step 5: Commit the asset-only implementation**

```bash
git add -- 'apps/lawyers.bh/public/images/team/habib-mohammed.png'
git commit -m "fix(lawyers-bh): tighten Habib portrait crop"
```
