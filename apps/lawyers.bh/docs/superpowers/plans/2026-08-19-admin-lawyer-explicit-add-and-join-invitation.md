# Admin Lawyer Explicit Add and Join Invitation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and email a lawyer only from the final explicit add action, and send a joining invitation without completion or missing-file language.

**Architecture:** Replace form-submit orchestration with a dedicated button-click handler that accepts the form element and owns validation plus the API request. Simplify the existing email-template module to a join-invitation contract, and make both automatic delivery and manual retry consume the same template.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Postmark, Tailwind CSS.

## Global Constraints

- Website only: `apps/lawyers.bh`.
- No database schema or production-data changes.
- Preserve the existing invitation token and `/complete-profile?token=...` destination.
- No API request on Enter, implicit form submit, step navigation, file selection, or signature drawing.
- User-facing email copy must not contain `استكمال الملف`, missing-item lists, file names, or checklists.
- Email subject is `دعوة للانضمام إلى منصة محامون البحرين`.
- Email CTA is `قبول الدعوة والانضمام`.

---

### Task 1: Make Add Explicit-Click Only

**Files:**
- Modify: `app/[locale]/admin/lawyers/new/Content.tsx`
- Modify: `app/[locale]/admin/lawyers/new/submission-policy.ts`
- Modify: `app/[locale]/admin/lawyers/new/submission-policy.test.ts`

**Interfaces:**
- Produces: `isExplicitAddSubmission(source: "final-add-button" | "implicit"): boolean`.
- The form `onSubmit` only prevents the browser default.
- The final button calls `handleExplicitAdd(form: HTMLFormElement)` directly.

- [ ] **Step 1: Write the failing submission-policy test**

Assert that `implicit` returns false and `final-add-button` returns true. Add a testable handler boundary proving the request callback is invoked only for `final-add-button`.

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm exec vitest run 'app/[locale]/admin/lawyers/new/submission-policy.test.ts'`

Expected: FAIL because the current boolean/ref policy does not expose an explicit source or request boundary.

- [ ] **Step 3: Implement explicit orchestration**

Change the form to `onSubmit={(event) => event.preventDefault()}`. Replace `handleSubmit(event)` with `handleExplicitAdd(form)` and call it only from the final `type="button"` click handler. Remove `explicitAddRequestedRef` and `requestSubmit()` so browser submit events have no path to `fetch("/api/admin/lawyers/invite")`.

- [ ] **Step 4: Run the policy test and verify GREEN**

Run: `pnpm exec vitest run 'app/[locale]/admin/lawyers/new/submission-policy.test.ts'`

Expected: PASS.

---

### Task 2: Replace Completion Email with Join Invitation

**Files:**
- Modify: `app/[locale]/admin/lawyers/new/emailTemplates.ts`
- Create: `app/[locale]/admin/lawyers/new/emailTemplates.test.ts`
- Modify: `app/[locale]/admin/lawyers/new/Content.tsx`
- Modify: `lib/admin/lawyer-invitation-email.test.ts`

**Interfaces:**
- Keep exports `lawyerProfileCompletionEmailSubject`, `lawyerProfileCompletionEmailText`, and `lawyerProfileCompletionEmailHtml` to avoid breaking existing imports, but change their output contract to join-invitation copy.
- Remove `missingItems` from `LawyerProfileCompletionEmailInput` and all callers.

- [ ] **Step 1: Write failing template tests**

Assert subject, text, and HTML contain `دعوة للانضمام إلى منصة محامون البحرين`, the secure token link, and HTML CTA `قبول الدعوة والانضمام`. Assert text and HTML do not contain `استكمال الملف`, `البيانات الناقصة`, `شهادة الآيبان`, `ملف الرخصة`, or checklist markup.

- [ ] **Step 2: Run template tests and verify RED**

Run: `pnpm exec vitest run 'app/[locale]/admin/lawyers/new/emailTemplates.test.ts' lib/admin/lawyer-invitation-email.test.ts`

Expected: FAIL because the current template is a completion checklist.

- [ ] **Step 3: Implement the join invitation**

Remove missing-item types and helpers. Write concise Arabic text welcoming the lawyer and inviting them to join the platform's professional network. Keep support contact details and the secure link. Update HTML title, preheader, heading, body, CTA, and fallback-link instruction. Remove the checklist table entirely.

- [ ] **Step 4: Remove missing-item UI state**

Delete `buildMissingProfileItems`, `inviteMissingItems`, and `missingItems` arguments from the admin add page. Update success copy from profile-completion wording to join-invitation wording. Keep manual email retry for delivery failures.

- [ ] **Step 5: Run template and invitation tests and verify GREEN**

Run: `pnpm exec vitest run 'app/[locale]/admin/lawyers/new/emailTemplates.test.ts' lib/admin/lawyer-invitation-email.test.ts 'app/[locale]/admin/lawyers/new/submission-policy.test.ts'`

Expected: all tests PASS.

---

### Task 3: Verify the Complete Change

**Files:**
- Verify all files from Tasks 1 and 2.

**Interfaces:**
- No new interface; this task verifies the integrated result.

- [ ] **Step 1: Run focused tests**

Run: `pnpm exec vitest run 'app/[locale]/admin/lawyers/new/emailTemplates.test.ts' 'app/[locale]/admin/lawyers/new/submission-policy.test.ts' lib/admin/lawyer-invitation-email.test.ts`

- [ ] **Step 2: Run TypeScript and ESLint**

Run: `pnpm exec tsc --noEmit --incremental false`

Run: `pnpm exec eslint 'app/[locale]/admin/lawyers/new/Content.tsx' 'app/[locale]/admin/lawyers/new/emailTemplates.ts' 'app/[locale]/admin/lawyers/new/emailTemplates.test.ts' 'app/[locale]/admin/lawyers/new/submission-policy.ts' 'app/[locale]/admin/lawyers/new/submission-policy.test.ts' lib/admin/lawyer-invitation-email.ts lib/admin/lawyer-invitation-email.test.ts`

- [ ] **Step 3: Run the Next.js build**

Run: `pnpm build:next-only`

Expected: exit 0. If an unrelated existing environment error blocks page-data collection, report its exact route and error separately rather than claiming the full build passed.

- [ ] **Step 4: Review scope**

Run: `git diff --check` and `git status --short`. Confirm no database migration, production data, or unrelated user changes were modified. Do not push or deploy without a separate explicit request.
