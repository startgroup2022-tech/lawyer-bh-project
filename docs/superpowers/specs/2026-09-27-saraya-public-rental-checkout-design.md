# Saraya Public Rental Checkout Design

## Goal

Turn every publicly listed Saraya Square unit into a complete rental journey: the applicant selects a unit, verifies their identity, submits their details and documents, follows the configured owner-approval policy, pays electronically or by an approved offline method, signs the generated lease, and receives an active tenancy.

## Scope

This design extends the existing Saraya rental requests, invoices, payment demands, leases, documents, notifications, and audit logs. It does not create a parallel booking system or duplicate the existing management records.

The first release covers publicly listed physical units. Virtual-address checkout and meeting-room payment remain separate flows.

## Public Experience

Selecting an available unit opens a bilingual responsive unit-detail route. It displays only approved public information: unit name, type, area, floor, description, rent, deposit, fees, availability, and the expected approval mode.

The detail route presents two independent actions:

- **Book a visit** lets the visitor reserve one management-published viewing slot. A visit does not create a rental request, reserve the unit for payment, create a tenant membership, or generate a contract.
- **Rent now** starts the rental application immediately. A prior visit is never required.

The applicant proceeds through a focused step flow:

1. Unit and commercial terms review.
2. Applicant type: individual or company.
3. Contact and identity details.
4. Identity or commercial-registration document upload.
5. Email or mobile OTP verification.
6. Lease start date and duration confirmation.
7. Submission and status tracking.

OTP verification creates or restores a Saraya tenant account. The application is never stored as an anonymous guest record. Existing accounts are reused when the verified identity matches.

## Viewing Appointments

Property management publishes available viewing slots for a property and may optionally limit a slot to one unit. Each slot has a start time, end time, capacity, status, and optional bilingual instructions. Unit-specific slots appear first; property-wide slots may be offered when they are valid for the selected unit.

The visitor selects an available slot and provides name, mobile number, and email address. The system creates a confirmed appointment immediately without requiring a Saraya account. The appointment stores the selected property, unit, slot, contact details, locale, and a random management-safe reference. Contact details remain private and are never returned by anonymous listing endpoints.

Slot capacity is claimed transactionally. Concurrent requests cannot exceed capacity, and retries with the same idempotency key return the original appointment. A viewing appointment does not change unit availability and does not block direct rental applications.

After account creation, matching appointments may be linked to the verified tenant account without changing their original contact or audit history. The user can view, reschedule, or cancel an upcoming appointment from the account. Management can mark it completed, cancelled, or no-show and can add internal notes. Rescheduling atomically releases the old capacity and claims the new slot.

Confirmation and reminder notifications are sent to the visitor and management. Reminder delivery failure does not cancel a valid appointment and is recorded for retry.

## Approval Policy

Each property has a default rental approval mode:

- `instant`: a valid application is approved automatically and moves directly to payment.
- `owner_review`: the application waits for an authorized owner or super administrator decision.

Each unit can optionally override the property default. A null unit override inherits the property setting. The resolved policy is copied onto the rental request at submission so later setting changes cannot silently alter an in-progress application.

Instant approval uses the same transactional approval operation as manual approval, records a system decision actor, generates the invoice and payment demand, and appends an audit event. It does not bypass availability, overlap, document, or identity validation.

Manual approval notifies the scoped owner and property administration. Rejection requires a reason and sends a bilingual status notification to the applicant.

## Pricing and Availability

All payable amounts come from the server-side unit offer at submission. The client never supplies authoritative rent, deposit, fee, or currency values.

Submission locks and rechecks the unit. A unit cannot receive a new successful application when it is no longer publicly rentable, is occupied, or has an application already reserved for payment under the configured reservation policy.

The request stores a pricing snapshot and requested dates. Approval and final lease creation use this immutable snapshot unless an authorized manager explicitly issues a revised offer that the applicant accepts.

## Payment

Approval creates one invoice and one payment demand containing the initial rent, deposit, and applicable fees.

Two payment methods are supported:

- Electronic payment: the backend creates a checkout session. Only a verified provider callback or server-side provider lookup can mark the demand paid. A browser return URL is informational and cannot activate the lease.
- Bank transfer or manual payment: the applicant uploads a receipt and payment reference. The demand remains `verification_pending` until an accountant, property manager, or super administrator approves or rejects it.

Payment operations are idempotent. Duplicate callbacks, repeated approval requests, and browser retries cannot create duplicate invoices, demands, receipts, or leases.

## Contract Creation and Signing

Confirmed payment triggers lease creation from the approved request and pricing snapshot. The system creates:

- a lease in `pending_approval` or equivalent pre-activation state;
- the first immutable lease version;
- the complete rent schedule;
- a generated bilingual lease document;
- signature requests for the tenant and owner or authorized administrator.

The lease becomes active only after required signatures are complete. Activation marks the unit occupied and records the final signed document. If signing expires or is declined, the lease remains inactive and is escalated to administration; the system does not silently release or refund money.

## Applicant Tracking

After submission, the applicant sees a status timeline in their account:

- submitted;
- waiting for owner approval;
- approved and waiting for payment;
- payment verification pending;
- paid and preparing contract;
- waiting for signatures;
- active;
- rejected, expired, or cancelled.

Every status includes bilingual explanatory text and the next available action. Private applicant, payment, and contract data never appears on the anonymous public routes.

## Management Experience

Property settings gain the default approval mode. Unit editing gains an optional approval override with an explicit “inherit property setting” choice.

Owners and administrators receive a rental-request queue with unit, applicant, requested dates, price snapshot, documents, and a complete timeline. Authorized roles can approve, reject, verify offline payment, resend notifications, and inspect the generated contract. Role and property scoping continue to use existing Saraya authorization.

## Data and Service Boundaries

The implementation adds the minimum schema required for:

- viewing slots, appointment capacity, appointment status, and optional verified-account linkage;
- property default approval mode;
- nullable unit approval override;
- resolved approval mode and pricing snapshot on rental requests;
- applicant profile fields not already represented by the tenant account;
- OTP challenge state;
- payment method, provider reference, offline proof, and verification state;
- linkage from the rental request and payment demand to the generated lease and signed document.

Services remain separated by responsibility:

- public inventory exposes only approved listing and approval-mode labels;
- viewing scheduling owns public slot availability, transactional booking, rescheduling, cancellation, reminders, and management status updates;
- public onboarding verifies identity and creates or restores the tenant account;
- rental orchestration validates availability and applies the resolved approval policy;
- payment orchestration owns checkout sessions, callbacks, and offline verification;
- lease orchestration creates the lease only after confirmed payment;
- notification and audit services observe every state transition.

## Failure Handling

- A stale or unavailable unit returns a localized conflict and refreshes public availability.
- A full, disabled, expired, or concurrently claimed visit slot returns a localized conflict and refreshes the available slots.
- Appointment retries are idempotent; rescheduling never leaves both the old and new slot claimed.
- Invalid or expired OTP challenges do not create accounts or applications.
- Failed document uploads do not leave a submitted application with missing mandatory evidence.
- Owner approval conflicts are serialized and idempotent.
- Payment failures leave the approved request recoverable with a retry action.
- Offline payment rejection preserves the receipt history and allows a replacement proof.
- Contract generation or notification failures enter a retryable administrative state without marking the lease active.
- Raw database, payment-provider, storage, or signing errors are never exposed to the applicant.

## Security and Privacy

- Public APIs return no tenant, owner, contract, payment, identity, email, or phone data.
- Public viewing-slot APIs expose availability and instructions only; appointment contact details require a management or verified matching-user scope.
- OTP endpoints are rate-limited by identity, IP, and challenge.
- Uploaded identity and payment documents use private storage and authorized download routes.
- Server-side authorization scopes every owner, administrator, accountant, and tenant action to the relevant property and entity.
- Payment and signature callbacks require provider authentication, replay protection, and idempotency keys.
- Audit events record actor, source, previous state, next state, entity identifiers, and timestamps without copying secrets.

## Testing and Acceptance

Backend tests cover visit-slot publication, concurrent capacity, idempotent booking, rescheduling, cancellation, private contact data, policy inheritance and override, instant and manual approval, concurrent unit availability, pricing snapshots, account reuse, OTP expiry and rate limits, payment idempotency, offline verification authorization, lease creation, signature-gated activation, and public-data privacy.

Flutter tests cover Arabic RTL and English LTR, mobile and desktop layouts, the unit-detail flow, independent visit and rental actions, slot selection, appointment confirmation, applicant validation, OTP, document upload, both approval modes, both payment methods, retryable failures, and the account timeline.

The production acceptance journey verifies:

1. An anonymous visitor can open a listed unit without login.
2. The visitor can book an available visit slot without creating a rental request or blocking direct rental.
3. Two concurrent visitors cannot overbook a visit slot.
4. OTP verification creates or restores the tenant account.
5. An instant-approval unit reaches payment without owner interaction.
6. A manual-approval unit remains blocked until the scoped owner approves it.
7. Electronic payment requires verified backend confirmation.
8. Offline payment requires authorized review.
9. Confirmed payment creates exactly one lease and signing package.
10. The unit becomes occupied only after all required signatures.
11. Anonymous APIs never expose appointment contacts, applicant data, or contract fields.

## Delivery Order

1. Viewing slots, public appointment booking, and management calendar.
2. Approval settings and rental-request orchestration.
3. Public applicant onboarding and OTP.
4. Public unit-detail with independent visit and rental flows.
5. Electronic and offline payment orchestration.
6. Lease generation, signing, and activation.
7. Management queues, notifications, timeline, and full acceptance verification.
