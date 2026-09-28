# Lawyer Approval Email Design

## Goal

Notify a lawyer by email when an administrator accepts the lawyer's completed registration application for the first time.

## Trigger Boundary

- Send only when the admin approval route successfully changes the application from `pending` to `approved` and activates the lawyer account.
- Do not send when the same approval endpoint is used to repair or complete Tap onboarding for an application that was already `approved`.
- Do not send on reactivation, rejection, suspension, incomplete registration, or registration submission.
- Start delivery only after the approval state has been stored successfully.

## Recipient and Language

- Send to the normalized email address stored on the approved lawyer record.
- Use the stored registration locale: Arabic for `ar`, English otherwise.
- Address the lawyer using the name matching the selected language, falling back to the other stored name when needed.

## Message Content

### Arabic

- Subject: `تهانينا، تم قبول تسجيلك | محامون البحرين`
- Core message: `تهانينا، تم قبول تسجيلك في منصة محامون البحرين، وأصبح حسابك معتمدًا.`

### English

- Subject: `Congratulations, your registration has been approved | Lawyers.bh`
- Core message: `Congratulations, your registration on Lawyers.bh has been approved, and your account is now verified.`

The message contains no documents, passwords, password hashes, IBAN or payment data, IP/user-agent data, blob paths, or private storage URLs.

## Delivery and Failure Handling

- Reuse the existing Postmark sender and configured sender/message stream.
- Add a focused approval-email module with an injected delivery function so recipient, locale, copy, and failure behavior are testable without sending real email.
- Run the email operation after the approval transaction succeeds.
- Treat email delivery as best-effort: a Postmark failure is logged server-side and must not reverse or change a successful approval response.
- Log only the lawyer ID, intended audience, and delivery error; do not log the full email body or sensitive application data.

## Approval Route Integration

Extend the approval route's initial application query to retrieve only the fields required for the email: email, Arabic name, English name, and locale. Capture whether the original status was `pending` before approval. After `finalizeTapAdminApproval` succeeds, invoke the approval-email module only when that captured state indicates the first approval.

The existing Tap onboarding scheduling and approval response remain unchanged.

## Testing

- Verify Arabic recipient, subject, and acceptance text.
- Verify English recipient, subject, and acceptance text.
- Verify HTML interpolation is escaped.
- Verify delivery failure resolves without throwing.
- Verify the first-approval predicate permits `pending` and rejects already-`approved` Tap repair.
- Run focused tests, lint for changed files, TypeScript checking, and the full suite; report unrelated existing failures separately.

## Deployment

Implementation and local verification do not authorize deployment. Live email delivery requires the existing Postmark environment variables to remain valid.
