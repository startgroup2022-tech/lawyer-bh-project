# Lawyer Approval Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send a localized acceptance email exactly once when an administrator first changes a lawyer application from pending to approved.

**Architecture:** Create a small approval-email module with a typed safe input, localized message builder, first-approval predicate, and injected Postmark delivery. Extend the existing approval route query with only the recipient fields, capture the original status, and call the module after durable approval only for an original `pending` status.

**Tech Stack:** TypeScript, Next.js route handlers, Postmark through `lib/postmark.ts`, Vitest.

## Global Constraints

- Send only after a successful first transition from `pending` to `approved`.
- Never send during Tap repair for an already-approved lawyer.
- Use Arabic for stored locale `ar` and English otherwise.
- Use the exact approved Arabic and English subjects and core messages.
- Email failure must not reverse or change a successful approval response.
- Do not include documents, credentials, financial data, request metadata, or storage locations.
- Do not change Tap onboarding behavior or deploy to production.

---

## File Structure

- Create `apps/lawyers.bh/lib/registration/lawyer-approval-email.ts`: localized message, first-approval predicate, and contained delivery.
- Create `apps/lawyers.bh/lib/registration/lawyer-approval-email.test.ts`: language, escaping, failure, and duplicate-prevention behavior.
- Modify `apps/lawyers.bh/app/api/admin/provider-applications/[id]/approve/route.ts`: retrieve safe recipient fields and invoke the module after first approval.

### Task 1: Approval Email Module

**Files:**
- Create: `apps/lawyers.bh/lib/registration/lawyer-approval-email.ts`
- Create: `apps/lawyers.bh/lib/registration/lawyer-approval-email.test.ts`

**Interfaces:**
- Consumes: `sendEmail(input: SendEmailInput)` and `escapeHtml(value: string)` from `@/lib/postmark`.
- Produces: `isFirstLawyerApproval(previousStatus: string): boolean` and `sendLawyerApprovalEmail(input, deliver?): Promise<void>`.

- [ ] **Step 1: Write failing tests for Arabic and English messages**

```ts
const lawyer = {
  lawyerId: "lawyer-123",
  email: "lawyer@example.com",
  fullNameAr: "محامٍ تجريبي",
  fullNameEn: "Test Lawyer",
  locale: "ar" as const,
};

it("sends the approved Arabic acceptance message to the lawyer", async () => {
  const deliver = vi.fn<(message: EmailPayload) => Promise<unknown>>(async () => ({}));
  await sendLawyerApprovalEmail(lawyer, deliver);
  expect(deliver).toHaveBeenCalledOnce();
  expect(deliver.mock.calls[0]?.[0]).toMatchObject({
    to: "lawyer@example.com",
    subject: "تهانينا، تم قبول تسجيلك | محامون البحرين",
  });
  expect(deliver.mock.calls[0]?.[0].text).toContain(
    "تهانينا، تم قبول تسجيلك في منصة محامون البحرين، وأصبح حسابك معتمدًا.",
  );
});

it("sends the approved English acceptance message for an English registration", async () => {
  const deliver = vi.fn<(message: EmailPayload) => Promise<unknown>>(async () => ({}));
  await sendLawyerApprovalEmail({ ...lawyer, locale: "en" }, deliver);
  expect(deliver.mock.calls[0]?.[0]).toMatchObject({
    to: "lawyer@example.com",
    subject: "Congratulations, your registration has been approved | Lawyers.bh",
  });
  expect(deliver.mock.calls[0]?.[0].text).toContain(
    "Congratulations, your registration on Lawyers.bh has been approved, and your account is now verified.",
  );
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter lawyers.bh exec vitest run lib/registration/lawyer-approval-email.test.ts`

Expected: FAIL because `lawyer-approval-email.ts` does not exist.

- [ ] **Step 3: Implement the typed localized sender**

```ts
export type LawyerApprovalEmailInput = {
  lawyerId: string;
  email: string;
  fullNameAr: string;
  fullNameEn: string;
  locale: "ar" | "en";
};

export function isFirstLawyerApproval(previousStatus: string) {
  return previousStatus === "pending";
}

export async function sendLawyerApprovalEmail(
  input: LawyerApprovalEmailInput,
  deliver: DeliverEmail = sendEmail,
) {
  try {
    await deliver(buildApprovalMessage(input));
  } catch (error) {
    console.error("[lawyer-approval-email] delivery failed", {
      lawyerId: input.lawyerId,
      audience: "lawyer",
      error,
    });
  }
}
```

Implement `buildApprovalMessage` with the exact approved subjects and core messages. Select the name using the locale with fallback, escape the name before HTML interpolation, and pass only `to`, `subject`, `text`, and `html` to the sender.

- [ ] **Step 4: Add duplicate-prevention, escaping, and failure tests**

```ts
it("sends only for the first pending-to-approved transition", () => {
  expect(isFirstLawyerApproval("pending")).toBe(true);
  expect(isFirstLawyerApproval("approved")).toBe(false);
  expect(isFirstLawyerApproval("rejected")).toBe(false);
  expect(isFirstLawyerApproval("suspended")).toBe(false);
});

it("escapes the lawyer name in HTML", async () => {
  const deliver = vi.fn<(message: EmailPayload) => Promise<unknown>>(async () => ({}));
  await sendLawyerApprovalEmail({ ...lawyer, fullNameAr: "<script>alert(1)</script>" }, deliver);
  expect(deliver.mock.calls[0]?.[0].html).toContain("&lt;script&gt;");
  expect(deliver.mock.calls[0]?.[0].html).not.toContain("<script>");
});

it("resolves when Postmark delivery fails", async () => {
  const deliver = vi.fn<(message: EmailPayload) => Promise<never>>(async () => {
    throw new Error("Postmark unavailable");
  });
  await expect(sendLawyerApprovalEmail(lawyer, deliver)).resolves.toBeUndefined();
});
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter lawyers.bh exec vitest run lib/registration/lawyer-approval-email.test.ts`

Expected: all approval-email tests pass.

### Task 2: Admin Approval Route Integration

**Files:**
- Modify: `apps/lawyers.bh/app/api/admin/provider-applications/[id]/approve/route.ts`
- Test: `apps/lawyers.bh/lib/registration/lawyer-approval-email.test.ts`

**Interfaces:**
- Consumes: `isFirstLawyerApproval(status)` and `sendLawyerApprovalEmail(input)` from Task 1.
- Produces: one contained email attempt after durable first approval.

- [ ] **Step 1: Extend the application query with safe recipient fields**

Add these projections to the existing `db.select`:

```ts
email: schema.bahrainLawyers.email,
fullNameAr: schema.bahrainLawyers.fullNameAr,
fullNameEn: schema.bahrainLawyers.fullNameEn,
locale: schema.bahrainLawyers.locale,
```

- [ ] **Step 2: Capture the original first-approval state before mutation**

Immediately after confirming the application exists, add:

```ts
const shouldSendApprovalEmail = isFirstLawyerApproval(application.status);
```

This value stays `false` for the existing approved-with-missing-Tap repair path.

- [ ] **Step 3: Send after durable approval and before returning success**

After `finalizeTapAdminApproval` resolves, add:

```ts
if (shouldSendApprovalEmail && application.email) {
  await sendLawyerApprovalEmail({
    lawyerId: updated.id,
    email: application.email,
    fullNameAr: application.fullNameAr,
    fullNameEn: application.fullNameEn,
    locale: application.locale === "ar" ? "ar" : "en",
  });
}
```

The schema permits a nullable email for older records, so a missing recipient skips delivery without failing approval. The sender contains Postmark errors, so the existing HTTP 202 approval response remains successful.

- [ ] **Step 4: Run focused approval tests**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter lawyers.bh exec vitest run lib/registration/lawyer-approval-email.test.ts lib/tap/admin-approval.test.ts`

Expected: all selected tests pass.

- [ ] **Step 5: Run lint and TypeScript checking**

Run lint on the route, module, and test. Then run `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter lawyers.bh exec tsc --noEmit --incremental false`. Record known unrelated `lib/sos/google-routes.test.ts` diagnostics separately.

- [ ] **Step 6: Run the full test suite**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter lawyers.bh test`

Expected: approval-email tests pass; record the known unrelated Drizzle journal failure separately if still present.

- [ ] **Step 7: Review scope and commit**

Run `git diff --check`, inspect only the approval route and two new files, and inspect `git status --short`. Commit only those files with `feat: email lawyers after approval`.

## Completion Evidence

- RED-to-GREEN tests prove localized copy, recipient, escaping, contained failure, and duplicate prevention.
- Route integration reads only safe recipient fields and sends after successful first approval.
- Tap repair, reactivation, and other status operations remain outside the email trigger.
- No deployment occurs without a separate explicit request.
