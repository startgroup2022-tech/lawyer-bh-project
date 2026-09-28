# Provider Balance Payment Page and PDFs Design

## Goal

Give a provider a Lawyers.bh payment link for each customer balance instead of exposing a Tap URL. The customer reviews the balance and pays through the existing Lawyers.bh payment experience. The provider can download a pre-payment invoice PDF and, after capture is confirmed, a payment receipt PDF.

## User Flow

1. The provider creates a customer balance from the provider dashboard.
2. Creating a payment link stores a Lawyers.bh URL using the balance's unique public reference, for example `/{locale}/payment?balance=BAL-...`. It does not create or expose a Tap charge yet.
3. Anyone holding that unguessable link can open it without logging in. The page retrieves only the public payment fields: public reference, provider display name, customer display name, description, amount, currency, due date, and payment status. Phone numbers, email addresses, provider IDs, and internal database IDs are never returned.
4. The existing payment page recognizes the `balance` query parameter and renders the current Lawyers.bh payment design with the balance details. Normal booking and SOS payment flows remain unchanged.
5. When the customer chooses a payment method and submits, a dedicated server endpoint verifies that the balance is payable, normalizes localized phone digits, loads the country's dialing code, creates the Tap charge, and stores its ID/status. Redirect-based payment methods then use the Tap transaction URL. Card and Apple Pay continue through the supported existing payment components.
6. Tap webhook confirmation remains the payment source of truth. It validates the retrieved charge against the balance, records the immutable allocation, and changes the balance to `paid` idempotently.
7. The customer returns to the same Lawyers.bh payment page. The page reads the server-side status and shows pending, paid, expired, cancelled, or failed clearly. A redirect result never overrides a server-confirmed paid state.

## Provider Dashboard

Each balance row offers actions appropriate to its server status:

- `draft` or `expired`: create/copy the Lawyers.bh payment link and download the invoice PDF.
- `pending_payment`: copy the Lawyers.bh payment link and download the invoice PDF.
- `paid`: show the paid state and download the payment receipt PDF. The original invoice remains available.
- `cancelled`: no payment action; the historical invoice may still be downloaded and is visibly marked cancelled.

The dashboard reports account, request-list, balance-list, and payment-link errors independently. Only an actual 401 session response asks the provider to log in again.

## PDF Documents

PDFs are generated on the server from authoritative database values and are bilingual according to the requested locale.

### Invoice PDF

The invoice contains the Lawyers.bh identity, document title, public reference, issue date, due date when present, provider name, customer name, service description, amount, currency, and current status. It contains no customer phone, email, internal IDs, Tap IDs, or allocation internals.

### Paid Receipt PDF

The receipt is available only after the database balance is `paid` and Tap capture has been verified. It contains the same commercial details plus the paid date and a clear paid marker. It does not expose sensitive Tap data. Attempts to download it before payment return a conflict response.

PDF endpoints use the public reference for provider-authorized dashboard downloads. Receipt generation always rechecks paid status at request time.

## API Boundaries

- Public balance-details endpoint: read-only, public-reference lookup, strictly limited response fields, no caching of private state.
- Balance payment endpoint: accepts the public reference and payment-method token/source, validates the current status atomically, and creates at most one active charge for the same balance attempt.
- Existing provider link endpoint: returns and stores the Lawyers.bh URL; it no longer calls Tap.
- Invoice and receipt endpoints: render PDFs from database values with locale-aware labels and safe filenames.
- Existing Tap confirmation endpoint: remains the only path that marks the balance paid and records its allocation.

## Error and State Handling

- Missing or unknown references show a neutral "payment request not found" state.
- Cancelled and paid balances cannot start another charge.
- Expired balances show an expired state until the provider regenerates/reactivates the link according to the existing transition policy.
- Tap rejection leaves the Lawyers.bh page visible with a localized retry message and does not mark the balance paid.
- Repeated payment submissions and webhook deliveries are idempotent.
- Arabic and Persian numerals are converted to ASCII before phone validation; the dialing code comes from the balance country rather than being fixed to Bahrain.

## Testing and Verification

- Unit tests cover localized phone normalization, country dialing codes, payable-state transitions, and PDF eligibility.
- Route tests cover public-field filtering, link creation without a Tap call, payment initiation, duplicate submission, and invoice/receipt authorization rules.
- Payment confirmation tests cover captured, pending, failed, mismatched, and repeated webhook events.
- UI tests cover loading the existing payment page from a public balance link and rendering pending, paid, expired, cancelled, and error states in Arabic and English.
- Before deployment, run focused tests, full type checking, the safe Next.js build, and browser checks for the provider dashboard, public payment page, Tap handoff, return status, and both PDF downloads.

## Out of Scope

- Emailing or messaging links/PDFs automatically.
- Editing a balance after payment.
- Replacing Tap as the payment processor.
- Changing booking or SOS pricing and commission rules.
