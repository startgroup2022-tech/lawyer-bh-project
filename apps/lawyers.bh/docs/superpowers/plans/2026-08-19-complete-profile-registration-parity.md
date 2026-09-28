# Complete Profile Registration Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the invitation completion page a four-step editable copy of registration that pre-fills every stored value and preserves untouched files.

**Architecture:** Expand the token-check and completion API contracts first, using small pure contract helpers and route tests. Then replace conditional hiding in the completion UI with a four-step form that always renders applicable fields and initializes them from the API response.

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle ORM, Vercel Blob, Vitest, Tailwind CSS.

## Global Constraints

- Do not modify the public `/join` page.
- Every applicable field must remain visible and editable.
- Password fields remain blank and password hashes never leave the server.
- Existing files remain when no replacement is selected.
- Support legacy Base64 and current Blob-backed records.
- Submit only from the final step and keep the token single-use.
- Preserve unrelated working-tree changes.

---

### Task 1: Complete-profile data contract

**Files:**
- Create: `lib/provider/complete-profile-contract.ts`
- Create: `lib/provider/complete-profile-contract.test.ts`
- Modify: `app/api/provider/complete-profile/check/route.ts`

**Interfaces:**
- Produces `CompleteProfileEditableData` containing subscription, identity, professional, banking, file, and agreement values.
- Produces `existingFileState({ fileName, mimeType, url, base64, previewRoute })` returning a safe file name, MIME type, presence flag, and preview URL.

- [ ] Write tests asserting all editable text fields survive mapping and Blob URLs are preferred while Base64 records use token-protected preview routes.
- [ ] Run the focused Vitest file and verify RED because the mapper does not exist.
- [ ] Implement the pure mapper and expand the check-route selection/response for subscription type, IBAN, CR number, all file names/MIME types/URLs, and existing values.
- [ ] Run the contract tests and verify GREEN.

### Task 2: Completion submission persistence

**Files:**
- Create: `lib/provider/complete-profile-update.ts`
- Create: `lib/provider/complete-profile-update.test.ts`
- Modify: `app/api/provider/complete-profile/route.ts`

**Interfaces:**
- Produces validated normalized editable text values.
- Produces file decisions that preserve existing metadata when the corresponding `File` is empty and replace only a supplied file.

- [ ] Write RED tests for normalized IBAN, provider type, editable email, CR number, preserved untouched file metadata, and replacement-file metadata.
- [ ] Implement the pure normalization and preservation helpers.
- [ ] Update the route to parse every visible field, validate duplicate email/license excluding the same provider, upload replacement files using the current Vercel Blob pattern, and persist URLs/paths without clearing untouched fields.
- [ ] Run focused tests and TypeScript until GREEN.

### Task 3: Four-step completion presentation

**Files:**
- Create: `app/[locale]/complete-profile/presentation.ts`
- Create: `app/[locale]/complete-profile/presentation.test.ts`
- Modify: `app/[locale]/complete-profile/Content.tsx`
- Reuse: `app/[locale]/complete-profile/_components/complete-profile/FileUploadCard.tsx`
- Reuse: `app/[locale]/complete-profile/_components/complete-profile/AgreementSignatureSection.tsx`

**Interfaces:**
- Produces four numbered steps matching registration field grouping.
- Consumes all token-check values as editable defaults and existing-file previews.

- [ ] Write RED presentation tests proving all required field names are assigned to one of four steps and no existing-value predicate can hide them.
- [ ] Replace the conditional single-page form with the registration stepper classes and four always-rendered step sections.
- [ ] Initialize controlled provider type and specialties from the check response; use `defaultValue` for editable text/select fields and always render file cards with current previews.
- [ ] Validate the active step before navigation and call the API only from the final submit button.
- [ ] Run presentation and focused API tests until GREEN.

### Task 4: Final verification

**Files:** All files above.

- [ ] Run focused Vitest tests.
- [ ] Run `pnpm exec tsc --noEmit --incremental false`.
- [ ] Run ESLint on changed files.
- [ ] Run `pnpm build:next-only` and report any unrelated environment failure separately.
- [ ] Run `git diff --check` and inspect scope.
- [ ] Verify an invitation with mixed existing/missing data in a browser: all four steps visible, every field editable, existing files previewed, and no API call before final submission.
