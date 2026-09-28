# Provider Paid Requests and Payment Balances Design

## Goal

Improve the provider dashboard so lawyers see only server-confirmed paid requests in pages of ten with exact bilingual case labels, and let providers create auditable customer payment balances and Tap payment links whose captured payments use the platform's existing commission schedule.

## Scope

This feature covers provider request visibility, server-side pagination/filtering/search, emergency case presentation, provider-created customer balances, Tap payment-link creation and confirmation, immutable commission allocation, and provider UI. It does not apply migrations, deploy code, alter production Tap configuration, or permit manual paid-state changes.

## Paid Request Eligibility

The provider request API is the enforcement boundary. It returns a booking or emergency request only when the stored payment state is paid/successful and the stored Tap charge state is exactly `CAPTURED`. Client-side filtering is supplemental and must not receive unpaid customer or case data.

The rule reuses the existing server-confirmed-payment policy and is applied to both list and request-detail endpoints so a provider cannot open an unpaid request by URL. Existing ownership rules remain mandatory.

## Request Pagination, Search, and Filters

The request API accepts validated query parameters:

- `page`: positive integer, default `1`
- `pageSize`: fixed to `10`
- `source`: `all`, `booking`, or `emergency`
- `status`: `all`, `paid`, `pending`, or `completed`; because unpaid requests are excluded, `pending` refers only to paid requests whose service workflow is pending
- `query`: normalized search text with a bounded length

Filtering and searching happen before pagination. The response contains `items`, `page`, `pageSize`, `totalItems`, and `totalPages`. Booking and emergency results are combined in descending creation order before the requested ten-row slice is returned. Page values beyond the last page return an empty list with valid metadata.

The dashboard resets to page 1 when search or filters change and shows previous/next controls plus the current and total page count.

## Exact Bilingual Case Names

Emergency responses preserve the internal `caseTypeCode` but also provide `caseTypeLabelAr` and `caseTypeLabelEn`. Labels are resolved from the active country's emergency-case catalog, falling back to the locked built-in catalog only when a database label is absent.

Examples include:

- `emergency_arrest`: `القبض والتوقيف والتحقيقات` / `Arrest, Detention & Investigations`
- `emergency_search`: `تفتيش المساكن أو المقرات` / `Search & Seizure`
- `emergency_travel_ban`: `المنع من السفر والحجز التحفظي` / `Travel Ban / Precautionary Attachment`
- `emergency_evidence`: `إثبات الحالة المستعجلة` / `Urgent Evidence Preservation`
- `emergency_report`: `البلاغات الجنائية والشكاوى العاجلة` / `Urgent Criminal Report`
- `emergency_consultation`: `استشارة قانونية طارئة` / `Emergency Legal Consultation`

The dashboard renders the label for the active locale and never presents a raw slug as the primary service name.

## Customer Balance Model

Add a `provider_customer_balances` table. Each balance contains:

- immutable ID and public reference
- provider ID and country code
- snapshot of provider Arabic/English name
- customer name, phone, and optional email
- service/case description
- amount and currency (`BHD` for Bahrain)
- optional due date
- status: `draft`, `pending_payment`, `paid`, `expired`, or `cancelled`
- Tap charge ID, transaction/payment URL, link creation/expiry timestamps, and sanitized Tap state
- paid timestamp
- creation/update timestamps

The provider identity and name snapshots come exclusively from the authenticated session and database. The browser cannot select or override the provider. Amounts use three-decimal precision, must be positive, and have a conservative server-enforced maximum.

Balance records are append-only for financial identity after a link is issued: provider, customer identity, description, amount, and currency cannot be edited. A draft may be cancelled; a pending link may expire or be replaced; a paid balance is immutable.

## Provider Balance Experience

The dashboard adds `Payment Links / روابط الدفع` and `Customer Balances / أرصدة العملاء` tabs.

The creation form collects customer name, phone, optional email, description, amount, and optional due date. Saving creates a draft. A separate explicit action creates the Tap payment link. This separation prevents a network error from losing the local financial record.

The balance list is server-paginated at ten rows and shows reference, customer, lawyer, description, amount, status, created date, due date, and payment date. Available actions depend on state:

- draft: create link or cancel
- pending payment: copy link, regenerate an expired/failed link, or cancel if no captured charge exists
- paid: view only
- expired: regenerate link or cancel
- cancelled: view only

The browser never receives Tap secrets. A paid status cannot be selected or submitted by the provider.

## Tap Link Creation and Confirmation

Link creation requires an authenticated active provider and an eligible draft/expired balance owned by that provider. The server creates a Tap charge/payment URL using the balance reference, exact amount, `BHD`, customer identity, and dedicated redirect/post URLs. The stored request is updated only with sanitized charge identifiers, URL, and state.

The dedicated webhook/confirmation flow validates:

- charge ID and balance reference match
- amount and currency match the immutable balance
- provider/balance environment matches the configured Tap mode
- Tap reports `CAPTURED`

Only then does it atomically mark the balance paid. Repeated confirmation of the same captured charge is idempotent. A different charge or mismatched amount/currency returns a conflict and never changes the balance.

## Commission and Accounting

When a balance becomes paid, create one immutable `bahrain_payment_allocations` record using the commission schedule effective at capture time. Store provider/platform percentages and amounts as snapshots, link the allocation to the customer balance, and retain the customer/provider name snapshots for auditing.

The database migration extends allocation source support with `provider_balance` and a nullable `provider_balance_id` guarded by a uniqueness constraint. The sum of provider and platform amounts must equal the captured amount at three-decimal precision. Existing booking and emergency allocations remain unchanged.

## Authorization and Safety

- Provider APIs require a valid provider session and dashboard access.
- Every read/write filters by authenticated provider ID and country code.
- Administrator or webhook routes retain their existing permission/signature boundaries.
- Raw Tap payloads, secret keys, authorization headers, and internal blob/storage fields are never returned to the provider.
- Rate-limit balance creation and link regeneration.
- Customer fields are bounded and validated; logs must not contain full payment credentials or secret values.
- No migration, live Tap call, deployment, or production change occurs without a separate explicit execution step and evidence.

## Error Handling

Stable error codes cover invalid input, ownership denial, unavailable account, invalid transition, Tap link failure, already-paid balance, mismatched charge, and unavailable configuration. Arabic and English UI messages map from these codes. Network/Tap failure preserves the existing draft or payable record and offers retry without duplicating a paid allocation.

## Testing and Verification

Implementation follows test-first development and proves:

- unpaid or non-captured booking/emergency requests never appear in list or detail APIs
- filters/search run before ten-item pagination and metadata is correct
- every emergency slug resolves to its exact Arabic/English label
- a provider cannot create or read another provider's balance
- provider identity snapshots cannot be supplied by the browser
- balance validation and state transitions reject invalid or manual-paid mutations
- Tap link retries do not create a second paid result
- only matching `CAPTURED` charges mark balances paid
- capture creates exactly one allocation with the current commission snapshot and correct three-decimal totals
- existing booking/emergency payment allocation behavior remains unchanged
- Arabic and English dashboard tabs, labels, pagination, and actions render correctly

Run focused tests, TypeScript, lint, the safe Next build, and a local browser walkthrough in Arabic and English. Apply migrations only to an isolated local database when its target is confirmed. Report local checks, database migration, Tap calls, deployment, and production status separately.

## Success Criteria

An active lawyer sees only confirmed-paid owned requests, ten per page, with exact localized case names. The lawyer can create a customer balance, generate and copy a Tap payment link, and track its state. A balance becomes paid only from a verified captured charge, then produces one immutable allocation using the current platform commission while preserving customer and lawyer identity snapshots.
