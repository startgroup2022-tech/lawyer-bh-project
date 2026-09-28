# LegalSOS Multi-Country Lawyer Registration Design

Date: 2026-09-24

## Objective

Keep lawyer registration fully inside the LegalSOS website while reusing the existing lawyers.bh backend, database infrastructure, administrator accounts, document security, and approval workflow. The first launch supports Bahrain and Saudi Arabia. Additional countries are activated in sequence after their infrastructure and policies are ready.

## Product Boundaries

- lawyers.bh remains a Bahrain-only public platform.
- LegalSOS is the multi-country public platform.
- The existing lawyers.bh administrator dashboard manages registrations from all enabled LegalSOS countries.
- Non-Bahrain providers must never appear in the public lawyers.bh directory, search results, SEO pages, or Bahrain-specific public APIs.
- Bahrain and Saudi Arabia use the same registration fields in this first phase.

## Country Routing

The selected country is part of the server-authoritative registration contract.

- `BH` registrations are written only to `bahrain_lawyers`.
- `SA` registrations are written only to `saudi_lawyers`.
- The server derives the destination table from the active country configuration and its safe table prefix.
- The browser cannot supply a table name.
- Registration is rejected when the country is inactive or its tables are not provisioned.
- The selected country is fixed for the submitted application and is revalidated by the backend.

## Architecture

LegalSOS keeps the registration interface and exposes a same-origin website endpoint. That endpoint relays the request to a dedicated lawyers.bh LegalSOS registration endpoint. The backend owns validation, country routing, duplicate detection, agreement binding, secure document persistence, notifications, and application creation.

Registration logic must be implemented as shared backend services rather than duplicating mobile, LegalSOS website, and lawyers.bh join-route behavior. Mobile and web adapters may differ, but they use the same country-routing and persistence layer.

The current compatibility route must not infer registration mode from the request URL after internal forwarding. Registration mode is explicit and server-controlled.

## Registration Form

The first release supports Bahrain and Saudi Arabia with the same fields:

- Arabic and English full names.
- Phone number and email address.
- Password and password confirmation.
- License number and license expiry date.
- IBAN.
- Years of experience.
- Communication language.
- Profile image.
- Lawyer license document.
- IBAN certificate.
- Personal identification document.
- Electronic signature.
- Agreement acceptance.

Phone and IBAN validation are country-aware. The country choice controls the phone prefix, IBAN prefix, agreement, destination table, notification copy, and administrator country badge.

The form keeps entered values after recoverable failures, prevents duplicate submission, and shows localized actionable messages for inactive country, invalid phone or IBAN, duplicate email or license, invalid document, stale agreement, unavailable service, and unexpected server failure.

## Agreements

- Bahrain uses its currently published lawyer agreement.
- Saudi Arabia has an independent agreement version in the same agreement management system, even if its initial wording is similar.
- Every application records country, agreement version, acceptance timestamp, signature, and integrity data.
- Updating one country's agreement does not change historical applications or another country's agreement.

## Administrator Workflow

The existing lawyers.bh administrator accounts and authorization system remain in use.

The registration review area provides:

- A combined application list.
- Filters for all countries, Bahrain, and Saudi Arabia.
- A visible country badge on every application.
- Country included in application details, notifications, and email.
- Secure document and signature review.
- Approve, reject, and request-completion actions.

Approval activates the provider only inside the provider's country. Administrator queries must include country identity so equal provider IDs or registration numbers in different country tables cannot cross scopes.

## Public Bahrain Isolation

All public lawyers.bh provider reads are constrained on the server to Bahrain. This includes directory listings, provider profiles, search, sitemap and SEO generation, booking candidates, and any public provider APIs.

The UI hiding a country is not considered sufficient isolation. Automated tests must verify that Saudi providers are absent from all Bahrain public surfaces.

## Arabic Terminology

User-facing standalone `محام` and `محامٍ` are replaced with `محامي` across LegalSOS website, LegalSOS app, and shared backend notifications relevant to the flow. Valid distinct words such as `المحامي`, `المحامين`, and `المحاماة` remain unchanged.

A regression test scans user-facing source strings to prevent the standalone forms from returning.

## Website and App Parity Scope

This registration project aligns the LegalSOS website with the app for country selection, registration fields, country-aware validation, agreement acceptance, document submission, success state, and pending-review state.

Other website parity gaps discovered during the audit—client request lists, functional portal navigation, full messaging and attachments, notifications, invoices, ratings, live tracking, account deletion, and a complete lawyer dashboard—remain separate implementation projects. They are not silently bundled into this registration change.

## Error Handling

- Database or country-catalogue failure displays a localized maintenance state instead of an empty country list.
- A failed response never causes automatic registration retry.
- Duplicate submission is prevented with a client lock and server idempotency control.
- Server error codes are mapped to Arabic, English, and Turkish messages.
- Sensitive internal values, including dispatch and authorization tokens, are never rendered to users.
- Uploaded documents remain private and require authorized administrator access.

## Infrastructure Prerequisite

Production database requests currently fail with quota error `53000`. The Neon account or project quota must be restored before end-to-end production verification or release. Code completion does not qualify as production readiness while the database rejects requests.

## Verification

Before release, verification must cover:

1. `BH` registration writes only to `bahrain_lawyers`.
2. `SA` registration writes only to `saudi_lawyers`.
3. Inactive or unprovisioned countries are rejected.
4. Duplicate email and license checks operate in the intended country scope.
5. Saudi providers are absent from every public lawyers.bh surface.
6. Administrator filters and country badges are correct.
7. Documents are private and accessible only to authorized administrators.
8. Agreement version and country are stored with the application.
9. Standalone `محام` and `محامٍ` do not appear in user-facing source strings.
10. Existing LegalSOS website tests pass, including the two currently failing tests.
11. React hook warnings affecting tracking, messaging, and country state are resolved or explicitly separated with evidence.
12. Arabic, English, and Turkish registration flows work on mobile and desktop viewports.
13. Local and preview verification precede any controlled real registration test.

Production checks must distinguish code tests, database checks, deployment readiness, public endpoint probes, and actual registration evidence.

## Rollout

1. Restore production database quota and verify country endpoints.
2. Build the shared registration service and dedicated LegalSOS endpoint.
3. Update the LegalSOS form, validation, terminology, and localized errors.
4. Add multi-country administrator filters and country badges.
5. Enforce and test Bahrain-only public lawyers.bh visibility.
6. Add independent Bahrain and Saudi agreement versions.
7. Run local and preview verification.
8. With explicit approval, perform one controlled registration test per country.
9. Deploy backend first, then LegalSOS website, and verify live endpoints without assuming deployment readiness proves registration success.

## Out of Scope

- Activating countries other than Bahrain and Saudi Arabia.
- Saudi-specific additional fields in the first phase.
- Redesigning the complete LegalSOS client or lawyer portals.
- Changing administrator credentials or creating a separate administrator system.
- Publicly exposing Saudi providers on lawyers.bh.
