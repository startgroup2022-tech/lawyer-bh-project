# Lawyer Registration Email Notifications Design

## Goal

Send two email notifications after a lawyer completes a registration application and the application is successfully stored for platform review: a confirmation to the lawyer and a review notification to the platform.

## Scope

- Cover the complete website registration flow handled by `app/api/join/route.ts`.
- Cover complete legacy/mobile submissions that delegate to the same join flow through `app/api/mobile/lawyers/register/route.ts`.
- Do not send these notifications when the mobile flow creates only an incomplete profile whose next step is `complete_profile`.
- Do not change approval decisions, registration validation, uploaded documents, or the registration response contract.

## Delivery

- Reuse the existing Postmark integration in `lib/postmark.ts`.
- Send the lawyer confirmation to the normalized email address saved with the application.
- Send the platform notification using the configured `POSTMARK_TO_EMAIL` default recipient.
- Use the configured sender and outbound message stream already used by the application.
- Start delivery only after the database operation has successfully stored the completed application in the pending-review state.
- Email delivery is best-effort: if Postmark is unavailable or misconfigured, preserve the successful registration response and record a server-side error without exposing configuration or personal data in the client response.

## Content and Language

### Lawyer confirmation

- Confirm that the registration application was received successfully.
- Explain that the application is awaiting platform review and that the lawyer will be contacted after review.
- Use Arabic when the submitted registration locale is Arabic and English otherwise.
- Address the lawyer by the submitted name in the selected language, falling back to the other available name.

### Platform review notification

- State that a new lawyer registration application requires review.
- Include only review-routing information: lawyer name, email, phone, registration/license number, country, and application identifier.
- Do not attach or embed identity documents, license files, IBAN certificates, signatures, passwords, password hashes, IP addresses, user-agent values, raw blob paths, or private storage URLs.
- Use bilingual Arabic and English content so platform reviewers can understand the notification regardless of the applicant locale.

## Architecture

Create a focused registration-email module that builds and sends the two messages through an injected email sender. The join route calls this module after persistence succeeds. Keeping message construction outside the route makes the content and recipients independently testable and avoids coupling route tests to Postmark.

The route awaits a settled notification operation before returning, but notification failures are caught and logged inside the notification boundary. This ensures registration remains successful while still making delivery failures observable in server logs.

## Duplicate-Send Boundary

The notification function runs only on the successful creation path for a new completed application. Duplicate email or license-number submissions return before persistence and must not send either email. The incomplete-profile mobile creation path must not send either email.

## Testing

- Unit-test both recipients, subjects, localized lawyer copy, bilingual platform copy, and the permitted platform fields.
- Verify that prohibited sensitive values are absent from the generated messages.
- Verify that both send attempts are made for a completed application.
- Verify that a failure from either email send is contained and does not turn a successfully stored registration into an API failure.
- Run the focused registration-email tests, relevant join/registration tests, TypeScript checking, and the existing test suite in proportion to the affected route.

## Deployment

Implementation and local verification do not authorize deployment. Production delivery requires valid existing Postmark settings, including `POSTMARK_SERVER_TOKEN` or `POSTMARK_API_TOKEN`, `POSTMARK_FROM_EMAIL`, and `POSTMARK_TO_EMAIL`.
