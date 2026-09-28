# Admin-Managed SOS Case Types Design

## Scope

Make SOS case types fully manageable from the Lawyers.bh administration site
while preserving the existing LegalSOS mobile case-list presentation. Extend
the catalogue so each case selects one supported execution workflow. Implement
the first new workflow for paid direct consultation, including lawyer matching,
five-minute acceptance, chat, and calling.

This design covers the Lawyers.bh database, admin UI, public mobile API, and the
LegalSOS Flutter client. It builds on the existing country-specific emergency
case catalogue and `/api/sos/case-types` endpoint.

## Catalogue data

Each country-specific SOS case type stores:

- Stable ID and immutable slug.
- Arabic and English names.
- Arabic and English descriptions.
- Arabic and English action labels.
- Price and ISO currency code.
- Display order and active/inactive status.
- Execution workflow: `emergency_dispatch` or `direct_consultation`.
- Custom icon asset URL and its storage identifier.

Existing rows migrate to `emergency_dispatch`. Their current icon keys remain
available during migration, but every newly created or edited case requires a
custom icon. The public API returns only active cases for the requested country,
ordered by display order and then name.

The stable ID and slug remain the payment and request identity. Renaming a case
does not alter previously created requests, invoices, or payment records.

## Admin page

Add a protected `SOS Cases` section to the existing administration area. It is
available only to users with the existing admin management permission used for
sensitive catalogue changes.

The list is filtered by country and displays the icon, localized name, price,
workflow, order, and active status. Administrators can create, edit, activate,
deactivate, and reorder cases. Deactivation is used instead of destructive
deletion when a case has been referenced by a request or payment.

The editor contains:

- Country.
- Immutable slug after creation.
- Arabic and English name.
- Arabic and English description.
- Arabic and English action label.
- Price and currency.
- Workflow selector.
- Display order and active status.
- SVG or transparent PNG upload with preview and replacement controls.

Uploads accept only validated SVG and PNG content within a documented size
limit. SVG content is sanitized before storage. The stored asset uses a
generated path rather than the original filename. Replacing an icon updates the
case only after the new upload succeeds; the previous asset is removed only
after it is no longer referenced.

All writes use server-side validation, audit the acting admin, and reject stale
updates using the row update timestamp. The admin receives localized inline
errors without losing entered form values.

## Mobile case list

The Flutter `SelectEmergencyTypeScreen` keeps its current layout, card sizing,
colors, spacing, background, loading, empty, error, refresh, and navigation
behavior. Names, descriptions, prices, order, workflow, and icons come from the
public catalogue response.

Custom icons are loaded from the returned asset URL and rendered in the same
icon position and size as the current Material icons. The client shows the
existing local fallback icon if an image is unavailable or invalid. It caches
successfully loaded icons through Flutter's image cache without treating a
failed icon as a failed catalogue load.

## Workflow routing

Selecting `emergency_dispatch` follows the existing emergency location, request
owner, payment, dispatch, and lawyer communication flow unchanged.

Selecting `direct_consultation` follows this sequence:

1. Collect the existing request-owner information required for payment and
   contact, without requesting or displaying a location step.
2. Present the existing payment flow using the selected catalogue price and
   case ID.
3. Confirm payment server-side. Matching must not begin until the payment record
   is confirmed paid and the Tap charge is captured under the existing payment
   safeguards.
4. Search for the first eligible available lawyer for the selected country and
   case context.
5. Show that lawyer's name and public summary to the client. The client can
   approve the proposed lawyer or decline and request the next eligible lawyer.
6. After client approval, send the request to that lawyer with a five-minute
   server-authoritative acceptance deadline.
7. If the lawyer accepts before the deadline, create or resolve the existing
   communication thread and open chat. The chat header exposes the existing
   call action.
8. If the lawyer rejects or the deadline expires, exclude that lawyer for this
   matching attempt and propose the next eligible lawyer without charging the
   client again.

Repeated client or lawyer actions are idempotent. A client cannot approve two
lawyers concurrently, and only one lawyer can win the request. Availability and
deadline decisions are enforced on the server, not by the mobile countdown.

## Payment and recovery

The confirmed payment belongs to the consultation request, not to one proposed
lawyer. Declining a proposal, lawyer rejection, timeout, transient network
failure, or reopening the app does not create another charge.

The mobile app persists the paid request identity and current matching state.
On restart it retrieves server state and resumes proposal, waiting, chat, or
recoverable failure. Inconclusive status or confirmation responses never turn a
captured payment into a terminal client failure.

If no lawyer is currently available, the paid request remains recoverable and
the client can retry matching. Refund or cancellation policy is outside this
feature and cannot be inferred or automated here.

## API boundaries

- Public catalogue reads remain country-scoped and unauthenticated.
- Admin catalogue writes require authenticated admin authorization and CSRF
  protection consistent with existing admin mutations.
- Icon uploads require the same admin authorization and return a validated
  storage identifier and public URL.
- Consultation proposal, client approval, lawyer acceptance/rejection, and
  current-state reads use authenticated, idempotent endpoints.
- API responses return stable machine codes; both web and mobile map them to
  localized user messages.

## Failure handling

- Invalid catalogue fields and uploads are rejected before database mutation.
- A failed icon upload never overwrites a working icon.
- Catalogue API failure preserves the mobile retry state and current visual
  error treatment.
- Payment confirmation failure remains recoverable and blocks matching until
  server confirmation succeeds.
- Lawyer availability races are resolved transactionally on the server.
- The five-minute deadline is stored in the database and evaluated by server
  time.
- Chat opens only when the request has one accepted lawyer and confirmed paid
  status.

## Verification

Database tests and migration verification cover defaults, constraints,
country-table provisioning, stable identities, and existing-row preservation.

Admin tests cover authorization, country filtering, complete validation,
create/edit/deactivate/reorder actions, stale-update rejection, icon file
validation, sanitized upload, preview data, and non-destructive replacement.

Public API tests cover active-only country-scoped results, stable ordering,
workflow fields, custom icon URLs, and backward-compatible fallbacks.

Flutter tests cover JSON parsing, image and fallback rendering, unchanged case
card layout, workflow routing, absence of location in direct consultation,
payment-first enforcement, proposal approval/decline, five-minute waiting,
timeout recovery, restart recovery, chat opening, and the call action.

Dispatch tests cover eligibility, single-winner concurrency, client and lawyer
idempotency, lawyer exclusion after rejection/expiry, server deadlines, and no
duplicate charge while cycling proposals.

Final manual verification covers admin editing, public API output, unchanged
mobile case-list appearance, an emergency case regression, and a paid direct
consultation through proposal, acceptance, chat, and call on test accounts.

## Out of scope

This feature does not redesign the mobile case list, change existing emergency
dispatch behavior, define automatic refunds, change Tap configuration, alter
lawyer eligibility policy beyond using its existing rules, or deploy to
production.
