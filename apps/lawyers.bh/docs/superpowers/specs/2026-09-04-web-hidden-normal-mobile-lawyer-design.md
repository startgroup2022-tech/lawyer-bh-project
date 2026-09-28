# Web-Hidden Normal Mobile Lawyer Design

## Goal

Make Habib Mohammed a normal lawyer everywhere in the LegalSOS mobile app,
including nearest-lawyer emergency selection and the complete case lifecycle,
while hiding his profile only from the public lawyers.bh website directory.

## Data Model

Add `is_public_directory_visible boolean NOT NULL DEFAULT true` to
`bahrain_lawyers`. Existing lawyers remain public by default. Set the Habib
lawyer row (`3ee97030-bc1a-47c1-b06c-bd2b1acee637`) to:

- `is_review_account = false`;
- `is_public_directory_visible = false`.

The two fields have separate meanings:

- `is_review_account` controls operational isolation from mobile directory,
  SOS dispatch, notifications, polling, and acceptance.
- `is_public_directory_visible` controls only public website listing/profile
  visibility.

No mobile or SOS code may consult `is_public_directory_visible`.

## Public Website

The shared public-lawyer query will require both `is_review_account = false`
and `is_public_directory_visible = true`. Direct public profile lookup must use
the same filtered data source, so a hidden lawyer cannot be reached by a known
slug or ID.

Habib must remain absent from Arabic and English directories, category counts,
search results, and public profile pages.

## Mobile Directory and Emergency Flow

Habib is no longer a review account, so all existing normal-lawyer rules apply
without exceptions:

- the mobile lawyer directory includes him when active and approved;
- SOS candidate selection includes him when active, approved,
  emergency-ready, payout/onboarding-ready, sharing a fresh live location, and
  otherwise eligible;
- the existing distance/radius ranking decides whether he is the nearest;
- polling, push, acceptance, arrival, completion, and payment allocation use
  the same paths as every other normal lawyer.

No temporary SOS test mode, hard-coded lawyer ID, phone allowlist, payout
bypass, or forced routing will be introduced.

## Migration and Rollout

Create one additive migration that adds the visibility column, indexes hidden
rows if useful for administration, and updates the exact Habib row. The update
must be idempotent and must not match by mutable name or phone.

The schema definition will expose `isPublicDirectoryVisible`. Production must
apply the migration before or with the code deployment. Existing rows retain
their current public visibility because the default is true.

The previous temporary environment allowlist used to show Habib in the mobile
directory becomes unnecessary after `is_review_account` is false and must be
removed from Production after deployment.

## Tests

Automated tests will prove:

- the public query excludes a non-review lawyer whose public visibility is
  false;
- the mobile directory includes Habib as a normal active approved lawyer
  without an allowlist;
- normal SOS eligibility permits Habib only under the same captured-payment
  and operational rules as other lawyers;
- review accounts remain excluded at all current isolation boundaries;
- no review-SOS test-mode code or environment setting remains;
- existing directory, dispatch, polling, acceptance, and payment tests pass.

## Operational Verification

After deployment:

- confirm the live mobile directory contains Habib;
- confirm Arabic and English public directories omit his ID, name, license,
  phone, and email;
- confirm his lawyer login reports a normal active account;
- when his lawyer app is online and sharing a fresh location, perform a paid
  device test and verify the normal nearest-lawyer flow rather than forced
  selection.

## Out of Scope

- Guaranteeing Habib is selected when another eligible lawyer is nearer.
- Bypassing payout onboarding, payment capture, live location, or availability.
- Hiding Habib from authenticated admin pages.
- Changing Tap payment behavior or Flutter UI.
