# LegalSOS Staged Lawyer Registration Design

**Date:** 2026-09-27
**Status:** Approved direction; implementation pending final design review

## Objective

Make lawyer registration easy to discover and quick to start while ensuring no lawyer account becomes active before the lawyer completes the full professional profile and an administrator approves the application.

## User Experience

### Entry point

- Add a clear `Register as a lawyer` link to the existing LegalSOS navbar in Arabic, English, and Turkish.
- Preserve the current header structure, branding, country selector, language selector, and client sign-in action.
- Route the link to a dedicated localized lawyer registration page instead of hiding registration inside the client portal.

### Stage 1: Quick registration

The first form contains only:

- Full name
- Email address
- Personal number / lawyer license number

The selected LegalSOS country is included automatically and shown to the user. The personal number and lawyer license number are represented by one field because they are the same identifier in the target workflow.

The quick name is stored as the name for the current interface language. If the country workflow requires Arabic and English names, the second-language name is requested only during full profile completion.

After validation, the system creates a staged onboarding application, not an active lawyer account. It sends a single-use verification link to the supplied email address and shows a neutral confirmation response that does not expose whether an existing account belongs to that email.

### Stage 2: Verified locked account

Opening the email link verifies ownership and establishes a secure onboarding session. The lawyer sees a locked account screen with:

- `Account not activated` status
- A short explanation that activation requires a completed profile and administrative approval
- A progress indicator
- A primary `Complete your information` action
- A resend-link action when the link is expired or unavailable

The lawyer cannot access the provider dashboard, accept requests, appear in the public directory, or use lawyer-only APIs in this state.

### Stage 3: Complete professional profile

The existing detailed lawyer registration fields and documents are reused where possible, prefilled with the verified name, email, identifier, and country. This stage includes the password setup required for future sign-in.

Submitting the complete form creates or finalizes the lawyer record with:

- `profile_completed = true`
- `status = pending`
- `is_active = false`

The user is then shown a locked `Pending approval` state. Repeated submissions must not create duplicate lawyer records.

### Stage 4: Administrative decision

- Approval changes the lawyer to `status = approved` and `is_active = true` using the existing administrative approval workflow.
- The administrator supplies or confirms any required membership number before approval, preserving the existing approved-account database constraint.
- Rejection keeps the account inactive and displays a safe rejection state with the configured reason when available.
- Only the approval action can activate the account.

## Recommended Architecture

### Separate onboarding application

Create a dedicated staged-onboarding table rather than inserting placeholder values into the country lawyer tables. The staged record stores only the minimum registration data and onboarding security state until the full profile is submitted.

Suggested fields:

- `id`
- `country_code`
- `full_name`
- `email` and normalized email
- `professional_identifier`
- `status`: `email_pending`, `profile_incomplete`, `submitted`, `expired`, or `cancelled`
- Hashed verification token and expiry
- Verification timestamp
- Submission timestamp
- Linked lawyer ID after successful full submission
- Locale, IP address, user agent, created and updated timestamps

The raw email verification token is never stored. Only a cryptographic hash is persisted.

### API boundaries

The LegalSOS website exposes same-origin routes that proxy to explicit backend routes:

- Start staged registration
- Verify or inspect a registration link
- Resend a verification link
- Submit the full profile against a verified onboarding session
- Read the current onboarding/account status

The backend remains authoritative for validation, duplicate checks, token issuance, state transitions, record creation, and email delivery.

The staged submission endpoint must use the pending-application creation logic and must not call the existing invitation-completion path while that path marks invited providers approved and active. Any shared validation or upload helpers may be reused, but activation fields remain exclusive to the administrative approval endpoint.

### State transition rules

Allowed transitions:

1. `email_pending` -> `profile_incomplete` after successful email verification.
2. `profile_incomplete` -> `submitted` after a valid complete-profile submission creates a pending lawyer record.
3. The linked lawyer remains inactive until the existing admin approval action changes it to approved and active.

No public endpoint may transition a lawyer directly to active. Expired or previously used tokens cannot be replayed.

## Validation and Duplicate Handling

- Normalize email and professional identifier before comparison.
- Enforce one active staged registration per country and normalized email.
- Enforce one active staged registration per country and professional identifier.
- Before creating the final lawyer record, check the country lawyer table for duplicate email or registration number.
- A repeated valid request returns the existing safe next step instead of creating another record.
- Rate-limit registration and resend operations by IP and normalized email.

## Security and Privacy

- Use single-use, time-limited email verification tokens stored only as hashes.
- Use an HTTP-only, same-site onboarding session after verification.
- Apply origin validation and CSRF protection to write operations.
- Never activate an account from registration or profile-completion endpoints.
- Avoid account enumeration in public responses.
- Keep uploaded identity, license, and banking documents private under the existing protected document flow.
- Record security-relevant state changes for auditability.

## Visual Design

- Follow the current polished LegalSOS visual language: dark navy surfaces, restrained gold accents, soft gradients, rounded cards, and clear Arabic RTL support.
- Keep the quick form visually lightweight, with one primary action and concise supporting text.
- Use a four-state progress presentation: email verification, information completion, review, activation.
- Display locked and pending states as reassuring status cards, not error screens.
- Maintain responsive behavior and large mobile touch targets.

## Compatibility

- Existing full lawyer registration and mobile registration remain operational unless explicitly routed through the new staged flow.
- Existing client portal behavior remains unchanged.
- Existing admin approval remains the sole activation authority.
- Existing country-specific lawyer tables continue to hold completed lawyer applications.

## Error Handling

- Invalid fields show localized inline messages.
- Expired links show a resend action.
- Duplicate registrations show a safe sign-in or resume instruction without leaking private details.
- Backend or email failures leave the staged record inactive and provide a retry path.
- A full-profile submission failure preserves the staged session and entered client-side values where safe.

## Testing Strategy

- Navbar link and localized route tests.
- Quick-form validation tests for the three required fields.
- API tests for normalization, duplicate prevention, rate limiting, and non-enumerating responses.
- Verification-token tests for hashing, expiry, one-time use, and replay prevention.
- State-transition tests proving that profile completion results in `pending` and `is_active = false`.
- Admin approval tests proving that activation occurs only after approval.
- Access tests proving locked and pending lawyers cannot use the provider dashboard or lawyer APIs.
- Responsive UI tests for Arabic RTL and mobile layouts.

## Local Verification Boundary

- Run focused tests, type checking, linting, and production build locally.
- Start the LegalSOS website locally and present the registration, locked, and pending states for review.
- Do not deploy, push, publish, or commit unless separately requested.
