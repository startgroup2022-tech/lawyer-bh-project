# LegalSOS Role Login and Expired-License Visibility

## Scope

This change fixes two production problems:

1. Lawyers automatically disabled because their license expired must appear under
   the suspended filter in the Lawyers.bh approvals dashboard.
2. The LegalSOS sign-in entry point must ask the visitor to choose Client,
   Lawyer, or Administration before showing a login form or an error.
3. LegalSOS footer and legal-policy contact copy must use `info@legalsos.org`.
4. Super administrators need an explicit database-provisioning control on the
   country-management page.

No authentication systems are merged. Existing client, provider, and
administrator credentials keep using their current backends.

## LegalSOS sign-in flow

Selecting **Sign in** opens a role chooser with three explicit choices and no
error message:

- **Client** opens the existing LegalSOS client email/password form in the
  portal.
- **Lawyer** goes to the localized Lawyers.bh provider login at
  `https://www.lawyers.bh/{locale}/login/provider`.
- **Administration** goes to the localized Lawyers.bh administrator login at
  `https://www.lawyers.bh/{locale}/login/admin`.

Returning to the chooser clears stale client-auth errors. Errors are displayed
only after a client submits the client login form and the server rejects it.
Arabic and English labels are supplied through the existing LegalSOS
translation dictionaries.

## LegalSOS contact address

The public footer and Arabic, English, and Turkish policy contact copy use
`info@legalsos.org`. Operational Lawyers.bh administration addresses are not
changed.

## Country database provisioning

An unprovisioned country card shows a **Provision database** action available
only to a super administrator. The confirmation form requires a calling code,
three-letter currency code, and default locale. The server validates the ISO
country code against the catalogue, normalizes the metadata, and activates the
existing transactional `countries_before_write` provisioning trigger. For a
country not yet stored in `countries`, a safe lower-case ISO table prefix is
created; an existing country's stored prefix is reused.

Provisioning is idempotent. A provisioned country displays its ready state and
cannot provision again from the UI. Failure leaves the country unprovisioned
and returns a localized error. App and website channel switches remain off and
independent; provisioning does not publish the country. There is no table-drop
or deprovision action.

## Expired-license state

The automatic license-expiry job will write the canonical state
`status = 'suspended'`, `is_active = false`, and
`suspension_type = 'license_expired'`.

A journaled migration repairs existing rows that have
`suspension_type = 'license_expired'` but still carry `status = 'approved'`.
It does not alter accounts suspended for another reason or reactivate any
account.

The approvals presentation also treats a non-null suspension type as suspended.
This read-side safeguard ensures legacy or partially migrated rows remain
visible in the suspended filter.

## Tests and verification

- A failing license-expiry store contract test proves the job writes suspended
  status.
- A presentation test proves a legacy approved row with
  `license_expired` is shown as suspended.
- LegalSOS component tests prove the initial sign-in view is a role chooser,
  contains the localized provider/admin destinations, and contains no auth
  error.
- Country API tests prove super-admin, same-origin, validation, idempotence, and
  provisioning delegation; UI tests prove the button is distinct from channel
  activation.
- Contact-copy tests reject the old `.com` address and require the `.org`
  address.
- Existing focused tests, TypeScript checks, production builds, migration
  verification, Git remote refs, Vercel readiness, and safe live endpoint
  checks are reported separately.

## Release

Work is performed in an isolated worktree. After verification, changes follow
the established DEV to PRODUCTION release sequence. Lawyers.bh is deployed
first so the migration and login destinations are live; LegalSOS is deployed
afterward. No real login attempt, registration, or account mutation is used for
live verification.
