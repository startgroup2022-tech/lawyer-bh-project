# Provider Agreement PDF Languages Implementation Plan

**Goal:** Give Lawyers.bh administrators control over the languages included in each new provider agreement PDF.

**Architecture:** Store the ordered language selection and manual additional-language copy in the structured builder version. Validate it on save and preview, then use the same versioned renderer for preview and signing. Keep old versions and legacy PDFs unchanged.

**Tech Stack:** Next.js, React, TypeScript, Vitest, pdf-lib.

## Global Constraints

- Existing structured versions without language settings render Arabic then English.
- Signed snapshots retain their historical bytes and selected languages.
- Additional language text is entered by the administrator; no automatic legal translation.
- UI changes stay inside the provider agreement admin and signing disclosure.

---

### Task 1: Versioned language model

**Files:** `lib/provider-agreement/builder-model.ts`, `builder-validation.ts`, `model.ts`, `builder-model.test.ts`.

- [x] Add tests that require an ordered, nonempty selection, valid unique language codes, complete manual copy, and preservation through `parseTemplate`.
- [x] Run focused test and confirm the new cases fail.
- [x] Add model types and parsing with backwards-compatible defaults.
- [x] Run focused test and confirm it passes.

### Task 2: PDF and disclosure

**Files:** `lib/provider-agreement/builder-pdf.ts`, `builder-materialize.ts`, `builder-pdf.test.ts`, `components/ProviderAgreementDisclosure.tsx`.

- [x] Add tests for Arabic-only, English-only, and a manual additional language in PDF content; verify no unselected language labels appear.
- [x] Run focused test and confirm failure.
- [x] Render only selected pages and selected language signature labels; show selected text in the registration disclosure.
- [x] Run focused test and confirm success.

### Task 3: Admin editor and verification

**Files:** `app/[locale]/admin/provider-agreement/AgreementAdmin.tsx`, `BuilderEditor.tsx`, `builder-editor.test.tsx`.

- [x] Add an editor test for selecting one language and adding manual copy.
- [x] Run focused test and confirm failure.
- [x] Add language controls, editable copy, party details, choice translations, and language-specific preview feedback.
- [x] Run focused tests, typecheck, lint, and a Next-only build. Render sample PDFs to images and inspect language coverage.
