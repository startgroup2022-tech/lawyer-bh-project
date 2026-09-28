# Provider Profile Change Approval Design

## Goal

Allow an approved provider to edit the complete profile while keeping currently approved data active until an administrator reviews sensitive changes. Ordinary profile changes take effect immediately. A pending sensitive change must never suspend an otherwise valid provider or leak unapproved data into the public directory, payments, dispatch, or other operational flows.

## Scope

This design covers the provider dashboard profile editor, provider profile APIs, administrator approval UI, protected document access, database persistence, notification/status feedback, and automated tests. It does not deploy migrations or application code to production, alter Tap onboarding automatically, or change the existing expired-license suspension policy.

## Field Policy

### Direct-update fields

These fields update the approved provider record immediately after validation:

- phone number
- years of experience
- spoken language
- working hours
- main specialty and sub-specialties

### Email

Email does not use the administrator approval queue. A change requires a separate ownership-verification flow before the approved provider email is replaced. Until that verification flow is completed, the current email remains active.

### Review-required fields

These fields are stored in a profile change request and do not replace approved values before approval:

- Arabic and English names
- provider roles/subscription types
- lawyer registration number and registration level
- IBAN number and IBAN certificate
- license expiry date and license file
- profile image
- personal ID file
- commercial registration number and institution license file
- signature

The API computes changes against approved values. Unchanged sensitive fields are not copied into the request.

## Provider Experience

The provider dashboard exposes all editable profile fields and existing uploaded files. Sensitive fields are visibly labelled as requiring review.

One save action may contain both direct and sensitive changes:

1. Validate the whole submission before mutating data.
2. Apply valid direct changes immediately.
3. Store sensitive differences in one active pending request.
4. Return both the updated approved profile and the pending request summary.

The dashboard continues to display approved values as the active profile. Next to affected sensitive fields it shows the proposed value or replacement filename with a bilingual `Pending review / بانتظار المراجعة` badge. A provider may update the active pending request; the latest submission replaces only the proposed fields included in that request. Clearing a proposed field restores its approved value and removes it from the request. If no proposed differences remain, the request is cancelled.

While a request is pending, the provider account remains active if it was active before submission. A normal profile change must not alter `status`, `is_active`, approval metadata, Tap onboarding state, or public eligibility.

After rejection, the provider sees the rejection reason and approved data remains unchanged. A later edit creates a new request rather than reopening the rejected record.

## Persistence Model

Add a `provider_profile_change_requests` table with:

- immutable request ID and provider ID
- country code
- status: `pending`, `approved`, `rejected`, or `cancelled`
- proposed scalar values in a typed JSON object containing only permitted sensitive keys
- proposed file metadata and blob locations in dedicated nullable columns for profile image, license, IBAN certificate, institution license, personal ID, and signature
- creation/update timestamps
- reviewer ID, review timestamp, and rejection reason

A partial unique database index permits at most one pending request per provider. Approved provider data remains in `bahrain_lawyers` and is the only source used by public and operational queries.

New files are uploaded to request-specific blob paths. Replacing a pending file makes the superseded pending blob eligible for cleanup. Approved blobs are never deleted while a request is pending. After approval, the new blob becomes authoritative and the previously approved blob becomes eligible for deferred cleanup. Rejection makes all request-only blobs eligible for cleanup.

## API and Transaction Rules

The provider profile read response includes:

- the approved profile
- an optional safe pending-change projection
- the most recent rejected request reason when relevant

The provider update endpoint requires an authenticated provider session and dashboard access. It validates direct fields, sensitive scalar fields, and every newly uploaded file using the same size/type constraints as registration and profile completion. It performs direct updates and the pending-request upsert in a database transaction after all file uploads succeed. A failure returns a structured bilingual-ready error code and does not partially update database values.

Administrator actions require `manage_approvals`. Approval locks the pending request, verifies it is still pending, applies all proposed scalar and file values to `bahrain_lawyers`, records reviewer metadata, and marks the request approved in one transaction. Concurrent or repeated decisions return a conflict and never apply twice.

Rejection requires a non-empty reason, leaves `bahrain_lawyers` unchanged, and records reviewer metadata atomically. Administrator file previews use protected routes; raw blob paths, Base64 values, password hashes, payment identifiers, and other internal fields are never included in browser payloads.

Email verification is delivered as a separately testable follow-up within the same feature plan. It must verify a short-lived code sent to the proposed address before atomically replacing the email and invalidating the verification challenge.

## Administrator Experience

Add a dedicated `Profile changes / تعديلات الملفات الشخصية` view within approvals rather than mixing requests with new-provider applications. It includes filters for pending, approved, and rejected requests.

Each request shows:

- provider identity and current account status
- request submission/update time
- only fields that changed
- side-by-side approved and proposed scalar values
- protected links or previews for old and proposed files
- approve and reject actions
- reviewer, decision time, and rejection reason for completed requests

The approval confirmation states that all displayed proposed changes will become active together. The rejection dialog requires a reason.

## Existing License-Renewal Interaction

An expired-license renewal remains governed by the current recovery flow: the provider may be inactive while the new license is reviewed. A provider whose current license is still valid uses this new profile-change request flow to propose a replacement license or expiry date without losing dashboard/public eligibility.

The implementation must keep these cases distinguishable in both APIs and administrator labels.

## Validation and Error Handling

- Reject unsupported fields instead of silently persisting them.
- Normalize IBAN, roles, specialties, dates, and bilingual names with existing helpers where applicable.
- Require a future license expiry date when license data is proposed.
- Require paired evidence where needed: a changed IBAN requires a new IBAN certificate; a changed license expiry date or license number requires a new license file.
- Preserve approved files when no replacement is supplied.
- Reject oversized or unsupported files before upload when possible and repeat authoritative validation on the server.
- Never expose a pending profile image in the public directory, dispatch responses, or provider header avatar.
- Use stable error codes so Arabic and English UI text remains localized.

## Testing and Verification

Implementation follows test-first development.

Automated coverage must prove:

- direct fields update immediately without creating a review request
- sensitive values remain unchanged while a pending request is created
- mixed submissions apply direct fields and queue sensitive fields correctly
- editing or cancelling a pending request behaves deterministically
- only one pending request exists per provider under concurrent saves
- approval atomically applies every proposed field and file exactly once
- rejection preserves all approved values and requires a reason
- unauthorized providers/admins cannot read files or mutate requests
- public directory, payment, and dispatch projections continue using approved values
- expired-license renewal behavior remains unchanged
- email is unchanged until the new address is verified
- Arabic and English provider/admin states and error codes render correctly

Run focused unit/API/UI tests first, then TypeScript checks, lint, database migration checks, the safe Next.js build that does not execute migrations, and a browser walkthrough of both provider and administrator flows in Arabic and English. Report local verification, migration application, deployment, and production status separately.

## Success Criteria

A provider can edit every supported profile field from the dashboard. Ordinary changes become active immediately. Sensitive changes are clearly pending and cannot affect any active/public/financial behavior until an authorized administrator approves them. Administrators can compare, preview, approve, or reject the complete proposed change with an auditable decision. Existing license-expiry protections and approved data remain intact throughout the process.
