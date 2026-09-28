# Paid Request Admin Notifications Design

Date: 2026-09-22

## Goal

Notify administration once whenever a LegalSOS request becomes server-confirmed paid, regardless of whether a lawyer is found. Delivery uses both administrator mobile push and email to `info@lawyers.bh` without delaying or changing the payment result.

## Trigger and Idempotency

The authoritative trigger is the first database transition where a `bahrain_emergency_requests` row satisfies both `payment_status = 'success'` and `tap_status = 'CAPTURED'`. A PostgreSQL trigger records an outbox item in the same transaction as that transition. The outbox enforces one paid-request notification per request, so repeated Tap callbacks, status reconciliation, webhook delivery, and client retries cannot duplicate the notification.

Requests that never reach both paid conditions do not notify administration. Existing `admin_request_escalated` notifications remain separate and continue to identify paid requests that require manual lawyer assignment.

## Delivery Model

Each paid-request outbox item tracks email and push delivery independently. A successful email is not resent because push failed, and a successful push is not repeated because email failed. Each incomplete channel retries with bounded exponential backoff and becomes terminal after the established retry limit or age limit. Notification failure never reverses or delays a confirmed payment.

Push recipients are all active administrators who have `manage_requests`, an unexpired mobile administrator session, and a registered valid device token. Duplicate tokens are deduplicated. The localized push opens the corresponding request in the administration area.

Email is sent only to `info@lawyers.bh` through the existing Postmark service. The message includes the request reference/identifier, amount and currency, confirmation time, and a direct administration link. It excludes access tokens, payment credentials, full Tap payloads, chat content, attachments, and unnecessary personal data.

## Processing

The existing scheduled LegalSOS maintenance route drains paid-request notifications as well as escalation and moderation notification work. After committing a newly captured payment, the payment-confirm path requests an immediate best-effort drain without awaiting provider delivery; the durable outbox and scheduled worker remain the source of reliability.

Concurrent workers claim rows with database locking and leases. Delivery state changes are conditional so only one worker owns a channel attempt at a time. Invalid Firebase tokens are pruned using the existing behavior.

## Database Changes

A forward-only migration adds the paid-request notification outbox, its unique request constraint, per-channel status and timestamps, retry metadata, and the paid-transition trigger. The Drizzle schema and migration journal are updated consistently. The migration is safe for existing already-paid requests: it does not backfill or notify historical requests.

## Administration and Configuration

The email recipient is fixed to `info@lawyers.bh` for this workflow. Postmark credentials and sender continue to come from the existing production environment. No new administrator password or login system is introduced.

## Failure Handling

- Database outbox insertion is transactional with the paid transition.
- Postmark or Firebase outages leave only the affected channel retryable.
- Missing email configuration records a sanitized delivery error and retries; it does not log secrets.
- No-recipient push attempts retry while administrator devices may become available.
- Terminal failures remain queryable in the outbox for operational diagnosis.

## Verification

Tests must prove:

- only the first transition to `success` plus `CAPTURED` creates an outbox item;
- failed, pending, cancelled, repeated, and historical paid rows do not create duplicate/new notifications;
- email always targets exactly `info@lawyers.bh` and contains only the approved request summary;
- all eligible administrator devices receive push while inactive, expired-session, ungranted, and unregistered administrators do not;
- email and push success/failure/retry states are independent;
- concurrent drains do not duplicate a channel delivery;
- payment confirmation still succeeds when delivery providers are unavailable.

Production completion requires the focused automated suites, TypeScript, migration application, Vercel `READY`, a live paid test request or approved safe equivalent, and evidence from the Postmark activity plus at least one administrator device. Git, migration, deployment, email delivery, and device delivery are reported separately.
