# Review Lawyer Account Design

## Goal

Provide one review lawyer using `habib20298@gmail.com` for testing the lawyer mobile application while keeping it invisible and inactive in every public or real-lawyer workflow. Production verification found no matching email and no existing review account, so creation is permitted only from that verified zero-record state.

## Account policy

- Create a new record only when the normalized email, registration number, phone, and membership number match counts and the total review-account count are all zero inside one serializable transaction.
- Abort without mutation if any identity-field match or any review account exists.
- Require the login identifier, phone, membership number, and Arabic/English display names as explicit execution inputs; do not embed account data in source.
- Set the password from a temporary environment value. Never store or print the password in source code, migrations, command history, or application logs.
- Keep normal lawyer authentication available so the account can sign in to the lawyer application.
- Keep the new record fully login-capable with `status = approved`, `is_active = true`, `is_emergency_ready = true`, and `profile_completed = true`; `is_review_account = true` remains the server-side isolation source of truth.

## Isolation boundaries

The account must remain excluded from:

- Public web and mobile lawyer directories and profiles.
- SOS dispatch candidates and request notifications.
- Lawyer request polling, request acceptance, and retry dispatch.
- Administrative or public counts intended to represent real visible lawyers.

Existing server-side `is_review_account` checks remain the source of truth. Client-side hiding is not sufficient.

## Execution

1. Verify no email, registration number, phone, membership number, or review account match exists.
2. Verify the review-account isolation tests and focused authentication password-operation tests.
3. Generate a strong temporary password and atomically create the minimum guarded record using explicit profile inputs.
4. Verify authentication through the lawyer mobile login API without exposing the password in logs.
5. Verify the account is absent from public directory results and cannot read or accept real SOS requests.
6. Deliver the email and temporary password directly to the user in the final response.

## Safety and failure handling

- Abort if any matching identity field or any flagged review record is found.
- Abort unless the insert returns exactly one new record.
- Do not alter approval, subscription, identity, membership, availability, or real-lawyer records.
- Do not weaken directory or dispatch filters to make the test account usable.
- If production credentials are unavailable, stop before any write and report the exact blocker.

## Acceptance criteria

- The supplied credentials successfully authenticate in the lawyer app.
- Exactly one account was created from a verified zero-record state.
- The account is approved, active, profile-complete, and can use normal application functions that do not expose or mutate real lawyer work.
- The account remains `is_review_account = true`.
- It is absent from all public directory responses.
- It receives no real request dispatch or notification and cannot accept a real request.
- No credential is committed to Git or emitted into application logs.
