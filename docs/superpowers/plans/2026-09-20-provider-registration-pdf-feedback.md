# Provider Registration PDF Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Identify which registration attachment failed PDF validation and show one actionable, localized form error without accepting an invalid document.

**Architecture:** Wrap `invalid_pdf` only at the upload boundary where the allowlisted field name is known. Return `{ok:false,error:'invalid_document',field}` from `/api/join`, then map that response to the existing field-error and step-navigation mechanisms. Keep all other upload and database behavior unchanged.

**Tech Stack:** Next.js App Router, TypeScript, Vercel Blob, PDF-lib, React, Vitest.

## Global Constraints

- Keep `validatePdf` and private document checks unchanged; do not accept malformed, renamed, or encrypted PDFs.
- Return only allowlisted field names, never filenames, document content, private URLs, raw exception messages, or account details.
- Preserve entered form values; a rejected document must not create a lawyer row.
- No production registration, database migration, or deployment under the local implementation phase.
- Preserve unrelated dirty work and stage only the files for this repair.

---

### Task 1: Field-aware PDF rejection at the server boundary

**Files:**
- Create: `apps/lawyers.bh/lib/uploads/document-error.ts`
- Create: `apps/lawyers.bh/lib/uploads/document-error.test.ts`
- Modify: `apps/lawyers.bh/lib/uploads/server.ts`
- Modify: `apps/lawyers.bh/app/api/join/route.ts`
- Test: `apps/lawyers.bh/lib/uploads/server.integration.test.ts` (isolated database test only when its dedicated URL is available)

**Interfaces:**
- `InvalidDocumentUploadError` carries an allowlisted `field` from `licenseFile`, `institutionLicenseFile`, `ibanCertificateFile`, or `personalIdFile`.
- `invalidDocumentResponse(error)` returns `{ok:false,error:'invalid_document',field}` with HTTP 400 for that error and `null` otherwise.
- The same response is used for malformed PDFs rejected while hydrating a direct upload and while storing a private document.

- [ ] **Step 1: Write failing tests.** Test a malformed PDF attributed to `licenseFile` returns only `{ok:false,error:'invalid_document',field:'licenseFile'}` and 400; unknown errors remain unmapped. In the isolated upload integration test, upload bytes beginning with `%PDF-` but lacking valid PDF structure and assert that `readDirectForm` rejects with an `InvalidDocumentUploadError` for `licenseFile` before any lawyer insert. Add the equivalent storage-boundary route test using a controlled `storePrivateDocument` rejection for `ibanCertificateFile`.

```ts
const response = invalidDocumentResponse(
  new InvalidDocumentUploadError('licenseFile'),
);
expect(response?.status).toBe(400);
expect(await response?.json()).toEqual({
  ok: false, error: 'invalid_document', field: 'licenseFile',
});
```

- [ ] **Step 2: Verify red.** From `apps/lawyers.bh`, run `pnpm exec vitest run lib/uploads/document-error.test.ts`; expect module-not-found or missing behavior, not a test setup error. Run the focused isolated integration test only if `UPLOAD_TEST_DATABASE_URL` points to its documented local test database; never use production Neon.
- [ ] **Step 3: Implement the minimal server change.** Add the allowlisted error type and response helper. In `readDirectForm`, catch `invalid_pdf` for each `item.field` and throw the field-aware error. In the final `Promise.all` storage block in `/api/join`, wrap each document upload with its fixed field name; convert only `invalid_pdf` to the field-aware error. Both existing catch blocks return `invalidDocumentResponse(err)` when non-null, otherwise keep their current generic responses. Do not add PDF repair or a bypass.

```ts
try {
  await validateUploadBytes(bytes, item.type);
} catch (error) {
  if (error instanceof Error && error.message === 'invalid_pdf')
    throw new InvalidDocumentUploadError(item.field);
  throw error;
}
```

- [ ] **Step 4: Verify green.** Run `pnpm exec vitest run lib/uploads/document-error.test.ts lib/uploads/validation.test.ts lib/uploads/policy.test.ts`; run the isolated integration suite only with the dedicated local database. Run `pnpm exec tsc --noEmit` and changed-file ESLint. Report unrelated baseline failures separately.
- [ ] **Step 5: Commit only the server and test files** after `git diff --cached --check`.

### Task 2: Single actionable error in the website form

**Files:**
- Create: `apps/lawyers.bh/lib/registration/join-upload-feedback.ts`
- Create: `apps/lawyers.bh/lib/registration/join-upload-feedback.test.ts`
- Modify: `apps/lawyers.bh/app/[locale]/join/Content.tsx`
- Test: `apps/lawyers.bh/app/[locale]/join/registrationOnly.test.tsx`

**Interfaces:**
- `joinUploadFeedback(data, locale)` returns an allowlisted field and localized instruction, or `null` for an unknown response.
- The form maps that output to `setFieldErrors`, `setRegisterStep(4)`, and `scheduleJoinFieldFocus(field)`; unknown failures set only one generic `submitError`.

- [ ] **Step 1: Write failing tests.** Test Arabic/English field-specific copy for each allowlisted document field and rejection of an unrecognized field. Test rendered form error markup contains one message rather than a hard-coded generic heading plus duplicate `submitError` when the form is in an error state.

```ts
expect(joinUploadFeedback(
  { error: 'invalid_document', field: 'ibanCertificateFile' }, 'ar',
)).toEqual({
  field: 'ibanCertificateFile',
  message: 'ملف شهادة الآيبان غير صالح. ارفع PDF صحيحًا غير محمي أو صورة مقبولة.',
});
```

- [ ] **Step 2: Verify red.** Run `pnpm exec vitest run lib/registration/join-upload-feedback.test.ts`; expect the helper/behavior to be absent. Run the form test independently and confirm it fails for duplicate copy.
- [ ] **Step 3: Implement the form behavior.** Parse `field` from the API JSON only for `invalid_document`. Apply the helper result to the existing `fieldErrors` state and step 4, without clearing other entered values. Render either the field error or a single generic `submitError`, never both and never duplicate generic text. Preserve the current handling for `license_or_personal_number_required` and agreement-version errors.

```tsx
const feedback = joinUploadFeedback(data, isAr ? 'ar' : 'en');
if (feedback) {
  setFieldErrors({ [feedback.field]: feedback.message });
  setSubmitError(null);
  setRegisterStep(4);
  scheduleJoinFieldFocus(feedback.field);
  return;
}
```

- [ ] **Step 4: Verify green.** Run `pnpm exec vitest run lib/registration/join-upload-feedback.test.ts 'app/[locale]/join/registrationOnly.test.tsx' lib/registration/join-step-validation.test.ts`, then TypeScript and changed-file ESLint.
- [ ] **Step 5: Commit only these UI/helper/test files** after `git diff --cached --check`.

### Task 3: Evidence and release handoff

**Files:** No production code changes.

- [ ] **Step 1:** Check all changed-file diffs and working-tree status; confirm PDF validation and database insert logic were not relaxed.
- [ ] **Step 2:** Run focused server and UI tests with fresh output and record typecheck/lint results. A local browser test may use synthetic PDFs only; do not create a production account.
- [ ] **Step 3:** State explicitly that a live registration retry still requires a separately authorized deployment and a valid user document. Do not claim that all PDFs will be accepted or that the submitted applicant is registered.
