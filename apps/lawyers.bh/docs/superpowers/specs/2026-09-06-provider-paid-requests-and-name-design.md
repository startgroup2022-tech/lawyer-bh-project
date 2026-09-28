# Provider Paid Requests and Display Name Design

## Goal

Ensure the website provider dashboard lists every request assigned to the signed-in provider after payment is authoritatively confirmed, while continuing to hide unpaid or unconfirmed requests. Display the provider's stored name without prepending a subscription title such as "المحامي" or "Lawyer".

## Scope

- Website provider dashboard only.
- Booking and emergency requests assigned to the signed-in provider.
- Requests are visible only when payment status is `paid` or `success` and Tap status is `CAPTURED`, compared case-insensitively after trimming.
- No changes to payment collection, request assignment, the mobile applications, or public directory naming.

## Request Data Flow

1. Authenticate the provider session and resolve its provider ID, country, and normalized email.
2. Load booking requests owned by the provider ID. For historical bookings, also accept a case-insensitive normalized match with the provider's current email.
3. Load emergency requests assigned to the provider ID.
4. Apply one shared authoritative paid-request predicate to both sources.
5. Normalize both sources into the dashboard request shape, sort newest first, then apply search, filters, and pagination.
6. Return an explicit server error if either source cannot be loaded; the client must not misreport this as an expired login session.

## Name Display

The dashboard header uses `fullNameAr` in Arabic and `fullNameEn` in English, with the other stored name as a fallback when the selected language value is blank. It does not prepend the subscription type title.

## Safety and Error Handling

- Never expose unpaid requests to the provider.
- Never infer successful payment from request service status alone.
- Keep country scoping on every request query.
- Keep server-side ownership checks; client-side filters are presentation only.
- Preserve distinct messages for session expiry, profile failure, and request-list failure.

## Verification

- Unit tests for normalized provider ownership and the paid/CAPTURED gate.
- Route-level regression coverage that a confirmed assigned booking and emergency request appear.
- Negative coverage for unpaid, non-captured, other-provider, and other-country requests.
- Unit coverage for display-name selection without the subscription prefix.
- Focused tests, TypeScript, and the safe Next.js build before completion.
