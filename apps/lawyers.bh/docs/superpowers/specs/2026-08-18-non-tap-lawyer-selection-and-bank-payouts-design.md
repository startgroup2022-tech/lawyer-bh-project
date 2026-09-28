# Non-Tap Lawyer Selection and Bank Payouts

## Goal

Allow an administrator-approved lawyer to be selected for every supported
service even when the lawyer's Tap Marketplace onboarding is pending, failed,
or otherwise not payout-ready. Payments for those requests are collected by
the platform, while the lawyer's contractual share is recorded as a payable
that can be settled by a documented manual bank transfer or, if still unpaid,
through Tap after the lawyer becomes payout-ready.

This applies to consultations, bookings, legal-service requests, and emergency
lawyer requests.

## Core Separation

The system must treat service eligibility and payout readiness as separate
states.

### Service eligibility

A lawyer becomes selectable immediately after administrative approval when:

- the provider status is `approved`;
- the provider account is active; and
- the provider is not suspended.

Tap onboarding status and `payout_enabled` do not affect service eligibility.

### Payout readiness

A selected lawyer is Tap payout-ready only when the onboarding record matches
the active Tap environment, its stage is `active`, and `payout_enabled` is
true.

If the lawyer is payout-ready, the existing provider payout path remains in
use. If the lawyer is not payout-ready, the platform collects the complete
customer payment and creates a delayed provider payable.

## Approval Behavior

Administrative approval must activate the lawyer for service selection
immediately. Tap onboarding continues independently after approval. A Tap
failure or pending KYC state must not deactivate an otherwise approved lawyer.

Suspension and rejection continue to remove the lawyer from selection.

The existing approval repair flow remains idempotent so an approval interrupted
by commission setup or onboarding can be safely retried.

## Lawyer Discovery and Selection

All lawyer discovery and resolution paths must use service eligibility rather
than Tap payout readiness. This includes:

- the public lawyer directory;
- available-lawyer selection for bookings and consultations;
- YourGPT lawyer selection;
- direct Tap charge lawyer resolution; and
- emergency dispatch candidate selection.

The server must repeat the eligibility check when accepting a selected lawyer.
Client-side visibility is not sufficient authorization.

The response may expose payout readiness for operational messaging, but the
customer must not be blocked from selecting the lawyer because Tap is pending
or failed.

## Payment Routing

At payment creation, the server resolves the selected lawyer and checks Tap
payout readiness.

### Tap-ready lawyer

- Preserve the selected lawyer ID and name.
- Use the current provider payment and allocation flow.
- Record the platform and lawyer shares using the commission rate effective at
  the payment time.

### Lawyer without Tap payout readiness

- Preserve the selected lawyer ID and name on the request and payment.
- Charge the customer through the platform merchant account without a provider
  destination.
- On captured payment, calculate and persist both the platform share and the
  lawyer share.
- Create a delayed payable for the lawyer with settlement method
  `bank_pending`.
- Store an immutable snapshot of the lawyer's IBAN, commission percentages,
  gross amount, platform amount, and lawyer amount at payment time.

The allocation is not `platform_only`: the payment belongs economically to the
platform and the selected lawyer according to their commission split, even
though the platform temporarily holds the lawyer share.

## Commission Rules

Every selected-lawyer payment has a platform share and a lawyer share.

The effective commission schedule at payment time is authoritative:

- during the first year from administrative approval: 20% platform and 80%
  lawyer;
- after the first year: 50% platform and 50% lawyer.

The chosen rate and calculated amounts are stored on the allocation and do not
change retroactively if the commission schedule later changes.

## Delayed Payables and Settlement

A delayed payable must contain:

- payment and request identity;
- selected lawyer identity and display name;
- gross amount and currency;
- platform percentage and amount;
- lawyer percentage and amount;
- IBAN snapshot;
- payout method and status;
- bank-transfer reference, transfer date, and recording administrator when
  applicable; and
- timestamps for creation, processing, settlement, failure, or cancellation.

Supported settlement statuses are:

- `bank_pending`;
- `processing`;
- `paid_bank`;
- `paid_tap`;
- `failed`; and
- `cancelled`.

An administrator can mark a payable as `paid_bank` only after entering a bank
transfer reference and transfer date. The system records the administrator
identity and settlement time.

If Tap becomes payout-ready before settlement, an unpaid payable may be paid
through Tap and marked `paid_tap`. A payable already settled by bank cannot be
paid through Tap, and a payable settled through Tap cannot be marked as paid by
bank.

A database uniqueness constraint and transactional status transition must
prevent duplicate payables and duplicate settlement for the same captured
payment allocation.

If no valid IBAN is available, the payable remains pending and the
administration dashboard shows that bank settlement is blocked until the IBAN
is corrected.

## Administration Dashboard

The payout dashboard must show pending and historical delayed payables with:

- lawyer name and membership number;
- IBAN snapshot;
- request and payment references;
- payment date;
- gross amount;
- platform percentage and amount;
- lawyer percentage and net amount;
- current settlement status;
- settlement method, reference, date, and administrator when settled.

The dashboard supports recording a manual bank settlement and clearly
distinguishes unpaid, processing, paid, failed, and cancelled records.

## Approval Dashboard Documents

The provider approvals dashboard must display:

- the lawyer's complete IBAN number;
- an `iban` file link for the IBAN certificate;
- the commercial registration number when present; and
- an `institution` file link for the commercial registration or institution
  licence when present.

The existing protected file route must support `profile`, `license`, `iban`,
and `institution`. Each type uses its Blob URL when available and retains the
legacy Base64 fallback. Individual lawyers are not required to provide a
commercial registration number or institution file; the dashboard displays
that they are absent rather than treating them as an error.

## Failure Handling and Reconciliation

Payment capture and allocation creation must be idempotent. If payment capture
succeeds but payable creation cannot be confirmed, the payment is flagged for
financial review and must not be presented as fully reconciled.

Retries use the captured payment identity to finish the missing allocation or
payable without charging the customer or creating a second liability.

Bank settlement updates are transactional and reject stale or already-settled
records with a conflict response.

Tap onboarding failures remain operationally visible but do not remove the
approved lawyer from customer selection.

## Data and Migration Requirements

The implementation requires a durable delayed-payables table or an equivalent
extension of the existing payment-allocation model. The selected design must:

- preserve existing captured-payment accounting;
- distinguish platform-only office payments from selected-lawyer payments held
  by the platform;
- snapshot IBAN and commission data at payment time;
- enforce one payable per captured allocation; and
- support atomic settlement status changes.

The migration must be additive and preserve existing production data. It must
include a verification query for constraints and indexes.

## Testing

Automated coverage must include:

- approved lawyers are selectable without Tap payout readiness;
- pending, failed, or KYC-pending Tap states do not block selection;
- rejected, inactive, or suspended lawyers remain unavailable;
- Tap-ready lawyers continue through the existing provider payout path;
- non-Tap lawyers are charged through the platform merchant path;
- selected lawyer identity remains attached to the request and payment;
- the effective commission schedule produces the stored platform and lawyer
  shares;
- captured non-Tap payments create one delayed payable;
- retries do not duplicate charges, allocations, or payables;
- bank settlement requires a reference and date;
- bank and Tap settlement cannot both complete for one payable;
- missing IBAN blocks bank settlement without losing the payable;
- approval dashboard responses include IBAN and optional commercial
  registration data; and
- `profile`, `license`, `iban`, and `institution` files support Blob URLs and
  legacy Base64 data.

Focused tests, TypeScript, ESLint, migration validation, and a production build
must pass before deployment. Production verification must separately confirm
lawyer visibility, platform charge routing, allocation creation, and manual
settlement behavior without exposing payment or bank secrets.

## Out of Scope

- automatic bank transfers using IBAN alone;
- changing the agreed 20/80 and 50/50 commission schedule;
- retroactively recalculating historical allocations;
- paying a lawyer before a captured customer payment exists; and
- requiring commercial registration documents from individual lawyers.
