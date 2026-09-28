# Admin Lawyer Explicit Add and Join Invitation Design

## Goal

Ensure a lawyer is created and emailed only after the administrator explicitly clicks the final add button, and replace the profile-completion email with a concise invitation to join Lawyers Bahrain.

## Scope

- Website only: `apps/lawyers.bh`.
- Admin add-lawyer wizard and its invitation email template.
- No database schema or production-data changes.
- Preserve the existing invitation token and destination page.

## Submission Design

The form will no longer own an asynchronous submit handler. Its submit event will only call `preventDefault`, so Enter, browser autofill, and implicit HTML form submission cannot call the API.

The final button remains `type="button"` and calls a dedicated explicit-add handler. That handler reads the form, performs validation, sends `POST /api/admin/lawyers/invite`, and updates the success or error state. Navigation buttons remain `type="button"`.

The API continues to create the lawyer and then send one invitation email. Repeated clicks remain blocked while the request is in progress.

## Email Design

The email is an invitation to join the platform, not a missing-profile reminder.

- Subject: `دعوة للانضمام إلى منصة محامون البحرين`
- Heading: `دعوة للانضمام إلى منصة محامون البحرين`
- Primary action: `قبول الدعوة والانضمام`
- Body: welcome the lawyer, explain that Lawyers Bahrain invites them to join its lawyer and legal-service-provider network, and provide the secure invitation link.
- Remove all missing-item calculations, missing-file lists, completion-checklist sections, and wording based on `استكمال الملف`.
- The invitation URL may continue to use the existing `/complete-profile?token=...` route internally; user-facing copy describes acceptance and joining.

## Error Handling

- Validation errors keep the administrator on the relevant wizard step.
- If lawyer creation fails, show the existing creation error and do not show success.
- If creation succeeds but email delivery fails, retain the created lawyer, show a clear delivery error, and allow an explicit retry.
- Automatic email delivery occurs only as part of the explicit final-add request.

## Tests

- A submission-policy test proves implicit form submission cannot call the add flow.
- A UI orchestration test or extracted handler test proves only the explicit final action invokes the request.
- Email-template tests prove the subject, heading, and CTA use joining language.
- Email-template tests prove output contains no missing-item labels, file names, checklist, or `استكمال الملف` wording.
- Focused Vitest, TypeScript, ESLint, and Next.js build checks run before completion is reported.
