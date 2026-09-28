# Complete Profile Step Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the website complete-profile wizard from advancing past invalid required fields while showing bilingual inline errors and red required marks matching registration.

**Architecture:** Add a pure complete-profile validation adapter that reuses the registration contract while recognizing stored documents, then wire its errors into the existing client wizard. Extend the current presentation components narrowly for required labels, inline errors, ARIA state, and deterministic first-error navigation; keep the API and data model unchanged.

**Tech Stack:** Next.js App Router, React 19 client components, TypeScript, Vitest, Testing Library, Tailwind CSS.

## Global Constraints

- Keep the existing four steps, fields, API request, stored-file preservation, signature behavior, and visual structure.
- Stored values and stored files count as completed and do not require re-upload.
- CR number and institution license remain optional.
- Validate the current step on Next and all steps on final submit.
- Preserve bilingual Arabic/English messages and RTL/LTR behavior.
- Do not change database schema, migrations, payment code, or backend request semantics.

---

### Task 1: Pure complete-profile validation contract

**Files:**
- Create: `lib/provider/complete-profile-step-validation.ts`
- Create: `lib/provider/complete-profile-step-validation.test.ts`

**Interfaces:**
- Consumes: `JoinValidationInput`, `JoinFieldErrors`, `JoinStep`, and `validateJoinStep` from `lib/registration/join-step-validation.ts`.
- Produces: `CompleteProfileValidationInput`, `validateCompleteProfileStep(input, step, locale)`, `validateAllCompleteProfileSteps(input, locale)`, and `getFirstCompleteProfileError(errors)`.

- [ ] **Step 1: Write failing tests** for empty required fields, bilingual messages, stored file metadata satisfying required uploads, optional CR/institution fields, password mismatch, and the first invalid step.
- [ ] **Step 2: Run** `pnpm vitest run lib/provider/complete-profile-step-validation.test.ts` and confirm failure because the module does not exist.
- [ ] **Step 3: Implement** a pure adapter that maps stored-or-new file state to `JoinFileValue`, calls `validateJoinStep`, maps registration field names to complete-profile names, and returns the earliest error using the order in `completeProfileSteps`.
- [ ] **Step 4: Run** `pnpm vitest run lib/provider/complete-profile-step-validation.test.ts` and confirm all tests pass.
- [ ] **Step 5: Commit** the new validator and tests with `test: add complete profile step validation`.

### Task 2: Inline errors, required marks, and guarded navigation

**Files:**
- Modify: `app/[locale]/complete-profile/Content.tsx`
- Modify: `app/[locale]/complete-profile/_components/complete-profile/FileUploadCard.tsx`
- Modify: `app/[locale]/complete-profile/_components/complete-profile/AgreementSignatureSection.tsx`
- Modify: `app/[locale]/complete-profile/presentation.ts`
- Modify: `app/[locale]/complete-profile/presentation.test.ts`
- Create: `app/[locale]/complete-profile/Content.test.tsx`

**Interfaces:**
- Consumes: Task 1 validator functions and the existing `RequiredMark` component.
- Produces: fields with `aria-invalid`, `aria-describedby`, red invalid borders, per-field localized errors, and Next/Submit handlers that focus the earliest error.

- [ ] **Step 1: Write failing presentation and component tests** proving required marks render, Next remains on step 1 when required values are empty, each invalid control has an inline message, and a stored file is not rejected.
- [ ] **Step 2: Run** `pnpm vitest run 'app/[locale]/complete-profile/presentation.test.ts' 'app/[locale]/complete-profile/Content.test.tsx'` and confirm the new assertions fail for missing UI behavior.
- [ ] **Step 3: Implement** `fieldErrors` state, `FieldError`, invalid props/borders, controlled error clearing, current-step validation, full-submit validation, step navigation, and focus/scroll to the first invalid field.
- [ ] **Step 4: Add required marks** to all required field/file/agreement/signature labels and keep optional labels unmarked.
- [ ] **Step 5: Run** the two focused component test files and the pure validation test until all pass.
- [ ] **Step 6: Commit** the UI and tests with `feat: enforce complete profile required fields`.

### Task 3: Verification and production release

**Files:**
- Verify only; no additional product files unless a check exposes a scoped defect.

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: verified commit on `DEV`, promoted to `PRODUCTION`, with a Ready Vercel deployment and a non-mutating browser check.

- [ ] **Step 1: Run focused tests** with `pnpm vitest run lib/provider/complete-profile-step-validation.test.ts 'app/[locale]/complete-profile/presentation.test.ts' 'app/[locale]/complete-profile/Content.test.tsx'`.
- [ ] **Step 2: Run type checking** with `pnpm exec tsc --noEmit`.
- [ ] **Step 3: Run lint** for touched TypeScript/TSX files with `pnpm exec eslint` and explicit paths.
- [ ] **Step 4: Run** `pnpm run build:next-only` and require exit code 0.
- [ ] **Step 5: Inspect** `git diff --check`, the scoped diff, and the current branch before pushing.
- [ ] **Step 6: Push DEV**, update PRODUCTION without force-push, and wait for the matching Vercel production deployment to reach Ready.
- [ ] **Step 7: Browser-check** the deployed complete-profile page with a non-mutating invalid/expired token path and confirm the page loads; do not submit a real provider application.
