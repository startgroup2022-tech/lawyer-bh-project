# Lawyer Registration Email Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send a localized receipt email to a lawyer and a bilingual review-request email to the configured platform address after a completed registration application is stored.

**Architecture:** Add a focused registration-email module that builds safe messages and performs best-effort delivery through an injected sender. Call it once after successful persistence in `app/api/join/route.ts`; complete mobile submissions inherit this shared flow, while incomplete mobile profile creation remains unchanged.

**Tech Stack:** TypeScript, Next.js route handlers, Postmark through `lib/postmark.ts`, Vitest.

## Global Constraints

- Send only after the completed application is stored with pending status.
- Send lawyer mail to the normalized applicant email and platform mail through the default `POSTMARK_TO_EMAIL` recipient.
- Use Arabic lawyer copy for Arabic registrations and English otherwise; make platform mail bilingual.
- Platform mail may contain only name, email, phone, license number, country, and application ID.
- Never include documents, signatures, passwords, password hashes, IBAN data, IP/user-agent data, blob paths, or private URLs.
- Email failure must not change a successfully stored registration into an API failure.
- Do not alter incomplete mobile registration or deploy to production.

---

## File Structure

- Create `apps/lawyers.bh/lib/registration/lawyer-registration-emails.ts` for message construction and best-effort delivery.
- Create `apps/lawyers.bh/lib/registration/lawyer-registration-emails.test.ts` for recipient, locale, safe-field, and failure coverage.
- Modify `apps/lawyers.bh/app/api/join/route.ts` to invoke notifications after successful persistence.

### Task 1: Registration Email Module

**Files:**
- Create: `apps/lawyers.bh/lib/registration/lawyer-registration-emails.ts`
- Create: `apps/lawyers.bh/lib/registration/lawyer-registration-emails.test.ts`

**Interfaces:**
- Consumes: `sendEmail(input: SendEmailInput)` and `escapeHtml(value: string)` from `@/lib/postmark`.
- Produces: `sendLawyerRegistrationEmails(input, deliver?) => Promise<void>`.

- [ ] **Step 1: Write the failing recipient and locale tests**

```ts
const application = {
  applicationId: "application-123",
  countryCode: "BH",
  email: "lawyer@example.com",
  phone: "+97330000000",
  fullNameAr: "محامٍ تجريبي",
  fullNameEn: "Test Lawyer",
  licenseNumber: "LAW-123",
  locale: "ar" as const,
};

it("sends Arabic lawyer confirmation and bilingual platform review mail", async () => {
  const deliver = vi.fn(async () => ({ MessageID: "message-id" }));
  await sendLawyerRegistrationEmails(application, deliver);
  expect(deliver).toHaveBeenCalledTimes(2);
  expect(deliver.mock.calls[0]?.[0]).toMatchObject({
    to: "lawyer@example.com",
    subject: "تم استلام طلب تسجيلك | محامون البحرين",
  });
  expect(deliver.mock.calls[0]?.[0].text).toContain("بانتظار المراجعة");
  expect(deliver.mock.calls[1]?.[0]).toMatchObject({
    subject: "طلب تسجيل محامٍ جديد للمراجعة | New lawyer registration",
  });
  expect(deliver.mock.calls[1]?.[0].to).toBeUndefined();
});

it("uses English lawyer copy for an English registration", async () => {
  const deliver = vi.fn(async () => ({ MessageID: "message-id" }));
  await sendLawyerRegistrationEmails({ ...application, locale: "en" }, deliver);
  expect(deliver.mock.calls[0]?.[0].subject).toBe(
    "Registration application received | Lawyers.bh",
  );
  expect(deliver.mock.calls[0]?.[0].text).toContain("awaiting review");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter lawyers.bh test -- lib/registration/lawyer-registration-emails.test.ts`

Expected: FAIL because `lawyer-registration-emails.ts` does not exist.

- [ ] **Step 3: Implement the typed notification boundary**

```ts
export type LawyerRegistrationEmailInput = {
  applicationId: string;
  countryCode: string;
  email: string;
  phone: string;
  fullNameAr: string;
  fullNameEn: string;
  licenseNumber: string;
  locale: "ar" | "en";
};

type DeliverEmail = (input: SendEmailInput) => Promise<unknown>;

export async function sendLawyerRegistrationEmails(
  input: LawyerRegistrationEmailInput,
  deliver: DeliverEmail = sendEmail,
) {
  const results = await Promise.allSettled([
    deliver(buildLawyerMessage(input)),
    deliver(buildPlatformMessage(input)),
  ]);

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("[lawyer-registration-email] delivery failed", {
        audience: index === 0 ? "lawyer" : "platform",
        applicationId: input.applicationId,
        error: result.reason,
      });
    }
  });
}
```

Implement `buildLawyerMessage` with the exact tested Arabic/English subjects and receipt copy. Implement `buildPlatformMessage` with bilingual text and HTML containing only the eight typed input fields. Escape every interpolated HTML value with `escapeHtml`; omit `to` from the platform message so `sendEmail` resolves `POSTMARK_TO_EMAIL`.

- [ ] **Step 4: Add safe-field and failure-containment tests**

```ts
it("contains review fields without sensitive registration data", async () => {
  const deliver = vi.fn(async () => ({ MessageID: "message-id" }));
  await sendLawyerRegistrationEmails(application, deliver);
  const combined = deliver.mock.calls.flatMap(([m]) => [m.text, m.html]).join("\n");
  expect(combined).toContain("application-123");
  expect(combined).toContain("LAW-123");
  expect(combined).not.toMatch(/password|iban|blob|signature/i);
});

it("attempts both messages and resolves when delivery fails", async () => {
  const deliver = vi.fn(async () => { throw new Error("Postmark unavailable"); });
  await expect(sendLawyerRegistrationEmails(application, deliver)).resolves.toBeUndefined();
  expect(deliver).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter lawyers.bh test -- lib/registration/lawyer-registration-emails.test.ts`

Expected: all new tests pass with zero failures.

- [ ] **Step 6: Commit the isolated module**

Stage only the two new registration-email files and commit with `feat: add lawyer registration email notifications`.

### Task 2: Completed Registration Integration

**Files:**
- Modify: `apps/lawyers.bh/app/api/join/route.ts`
- Test: `apps/lawyers.bh/lib/registration/lawyer-registration-emails.test.ts`

**Interfaces:**
- Consumes: `sendLawyerRegistrationEmails(input) => Promise<void>`.
- Produces: one best-effort notification operation after a newly completed application is stored.

- [ ] **Step 1: Add an exact permitted-payload test**

Assert that the input type has exactly `applicationId`, `countryCode`, `email`, `phone`, `fullNameAr`, `fullNameEn`, `licenseNumber`, and `locale`, preventing route integration from forwarding document or credential fields.

- [ ] **Step 2: Run the focused test before route wiring**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter lawyers.bh test -- lib/registration/lawyer-registration-emails.test.ts`

Expected: PASS, proving the safe payload contract.

- [ ] **Step 3: Wire the successful join path**

Import `sendLawyerRegistrationEmails` in `app/api/join/route.ts`. Immediately after the database save block assigns `applicationId` and before constructing the success response, add:

```ts
await sendLawyerRegistrationEmails({
  applicationId,
  countryCode,
  email,
  phone,
  fullNameAr,
  fullNameEn,
  licenseNumber,
  locale: lang,
});
```

Do not modify `app/api/mobile/lawyers/register/route.ts`: its complete submission already calls `submitJoinApplication`, while its incomplete-profile branch remains outside this notification point.

- [ ] **Step 4: Run focused registration tests**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter lawyers.bh test -- lib/registration/lawyer-registration-emails.test.ts lib/registration/lawyer-professional-profile-policy.test.ts`

Expected: all selected tests pass.

- [ ] **Step 5: Run TypeScript checking**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter lawyers.bh exec tsc --noEmit --incremental false`

Expected: exit code 0. Record unrelated pre-existing diagnostics separately without changing unrelated files.

- [ ] **Step 6: Run the complete test suite**

Run: `PATH=/Users/hma/.nvm/versions/node/v22.22.2/bin:$PATH pnpm --filter lawyers.bh test`

Expected: all tests pass with zero failures.

- [ ] **Step 7: Review scope and commit integration**

Run `git diff --check`, inspect the three registration files, and inspect `git status --short`. Keep existing mobile Tap changes excluded. Commit only the registration email module, its tests, and the join-route wiring with `feat: notify lawyers and platform after registration`.

## Completion Evidence

- Tests prove both recipient paths, locale selection, safe-field exclusion, and best-effort failure handling.
- The join route calls notifications only after completed-application persistence.
- Complete mobile submissions inherit the shared path; incomplete mobile creation remains unchanged.
- TypeScript and the full Vitest suite provide fresh verification evidence.
- No production deployment occurs without a separate explicit request.
