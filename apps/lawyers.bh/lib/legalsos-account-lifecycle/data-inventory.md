# LegalSOS deletion ownership review — local implementation checkpoint

This inventory records verified source relationships, not legal certification. Production was subsequently inspected read-only: 0091–0094 hashes match; no closure or due rows existed at that checkpoint. No production database was mutated in this continuation. The public deletion workflow remains disabled pending the remaining release gates.

## Current implementation checkpoint (supersedes historical stage status below)

The local transactional composition is now wired in `purge-account.ts`, with identity detachment last, and used by the protected cron route. Run auditing, bounded batches, notice retry, a five-minute schedule and synthetic PostgreSQL coverage exist. This is not live scheduling evidence. Fresh focused backend result: 147 tests passed in 22 files, zero skipped.

Lawyer `live_location`, its timestamp and SOS availability/sharing flags are now cleared on closure. Their producers/consumers serve emergency dispatch, unlike the independent professional `base_location`. Migration 0102 blocks delayed restoration, preserving the independent website account/base address. Tests cover both immediate closure and delayed writes. Request live traces are purged separately.

Shared transaction identifiers (`tap_charge_id`, payment/refund references) remain retained and must not be described as irreversibly anonymized. Backup/log/export expiry and restoration replay remain unverified. Those are real remaining gates, not covered by local test totals. No further duration question is required: the owner specified 30 days.

## Latest owner decision and verified additions

The owner reconfirmed a fixed 30-day window on 13 September. Do not ask for another financial duration or invent a longer exception. Preserve independently owned website and counterparty records; this does not certify legal compliance.

`purgeOwnedRequestData` now removes owned client contact/content/location/raw payment payload and unreferenced app consent. It also clears the client name snapshot and unstructured error text in associated payment allocations, preserving peer receivable figures and independent provider data. Migration 0096 persistently marks erased request and ledger copies and sanitizes delayed writes, including writes after ownership/request links are detached. Seven isolated PostgreSQL tests cover this stage. Charge IDs and remaining shared ledger ownership are **not** claimed anonymized or fully purged. Full cleanup orchestration remains unwired.

## Identities and account data

| Storage | Ownership and data | Cleanup boundary |
| --- | --- | --- |
| `mobile_client_accounts` | Client UUID; name, email, phone, password hash | App profile data. Revocation is implemented; final removal/anonymization is not. Request ownership must remain resolvable while old request capabilities exist. |
| `mobile_client_sessions`, `mobile_client_challenges` | `client_id`; some signup/reset challenges are instead addressed by current email | Closure removes subject sessions and challenges. Do not delete by phone or name. |
| `mobile_client_auth_limits` | Derived keys for credentials/IP/rate limiting | Identify subject-derived keys separately; do not delete unrelated IP limits and reopen abuse windows. |
| `bahrain_lawyers` | Shared website identity, password, registration, professional data, consent reference, live location | Do not delete the website account or shared professional files. App access is denied using separate lifecycle state. The shared location fields need a producer/consumer audit before any field-level purge. |
| `legalsos_account_lifecycle` | Role + subject UUID, immutable request/deletion dates | Minimal denial/processing record; no copied contact information. Keep denial effective after personal-data purge. |

## Requests, consent, and financial relationships

- `bahrain_emergency_requests.client_account_id` owns client-side app requests. `assigned_lawyer_id` and `candidate_lawyer_id` are different lawyer roles. Never treat the other party's personal data as owned by the closing account.
- Personal fields include `description`, `location` (coordinates/address), `contact_name`, `contact_phone`, `contact_id_number`, `rating_comment`, `internal_notes`, `cancellation_reason`, `last_advocate_location`, and actor logs. Structured payloads can also contain identifiers; removing only profile fields is not sufficient.
- Financial fields include fee, payment/refund status and references, `tap_charge_id`, and `tap_payload`. A raw Tap payload may contain personal data: preserving accounting figures does not justify retaining the complete payload indefinitely.
- `bahrain_payment_allocations.emergency_request_id` references requests with `ON DELETE CASCADE`. **Do not delete entire emergency request rows** as a shortcut: that can remove accounting records. Preserve figures while designing explicit personal-data redaction. The ledger also copies `customer_name_snapshot`, `provider_name_snapshot`, `provider_iban_snapshot`, and free-text `split_error`/settlement metadata; profile removal alone does not remove these copies. `tap_charge_id` is NOT NULL and unique, and can link back to payment-provider customer information: do not describe a retained charge ID as irreversible anonymization. Lawyer bank/professional payment data can have independent website ownership. Each applicable financial retention exception must identify the exact columns and legal expiry, rather than exempting the whole request.
- `bahrain_booking_requests.client_account_id` also references the client account with `ON DELETE SET NULL` (migration 0052). Booking data is not automatically part of the emergency-app deletion scope. Do not cascade cleanup by shared account ID without verifying its origin.
- `bahrain_consent_log` contains full name, ID number, signature, signed PDF, IP and user agent. Both emergency requests and shared lawyer profiles reference it. Consent shared with the website must not be deleted because one app request closes.
- `legalsos_deletion_settlements` tracks lifecycle/request review. Administrative review does not authorize refunds or extend the fixed deadline. Unresolved settlement requires escalation, not blanket indefinite retention.

## Conversations and attachments

- `bahrain_communication_messages`: request ownership plus `sender_role` and `sender_id`. Client actors are `client:<request UUID>`; lawyer actors use the lawyer UUID. Purging all messages by request would delete the other party's content.
- `bahrain_communication_attachments`: same role/actor ownership; includes filename, MIME, bytes (`content bytea`) and `message_id`. Current chunk-upload routes store chat bytes in PostgreSQL, **not Vercel Blob**. Delete attachment references/bytes before removing their referenced message. Do not introduce an unrelated blob deletion path for these files.
- `bahrain_communication_calls`: initiator role/id, call state and timing; shared call history. Redaction rules must preserve the other party's history and prevent deleted identifiers from reappearing through updates.
- `bahrain_communication_signal_events`: request/call sender identities, payload and expiry; signalling payloads can contain network addresses. Expiry and lifecycle cleanup both need verification.
- Shared provider documents/direct uploads and agreement files (migrations 0087/0088) belong to website professional identity. They are **not** app chat attachments and must not be deleted through the account closure queue.

## Devices, notifications, and capability pitfalls

- Lawyer installations are explicitly owned via `bahrain_mobile_push_installations.lawyer_id`; their subscriptions and call-push registrations are revoked at closure.
- Client installations have no client account FK. Unlink owned request subscriptions rather than guessing device ownership; determine how to remove account-specific device/cache data without erasing another signed-in account's device state.
- `mobile_client_notification_reads.owner_key` is `request:<request UUID>` for request events and `client:<client UUID>` for announcements. These are not communication actor IDs.
- `mobile_lawyer_notifications.lawyer_id` is explicit ownership. Do not delete the client's inbox when removing a lawyer inbox.
- Local `purgeOwnedNotifications` now removes only owned client request inbox copies/read receipts, or only the specified lawyer's inbox. Shared announcements, peer inboxes and website lawyer identities are preserved. Migration 0095 rejects delayed inbox/read writes for closed owners, including client requests whose owner FK was detached but revocation marker remains. Six isolated PostgreSQL tests cover cleanup, premature refusal, rollback and delayed writes. This stage is not wired to a production worker and is not full-account purge evidence.
- `mobile_notification_token_bindings` stores token digests mapped to device preference keys. Map these to known revoked capabilities before removing bindings; shared device preferences may outlive a session.
- `lib/client-notifications/input.ts` verifies legacy dispatch signatures; the HTTP handler now additionally requires `authorizeInboxRequests` to verify request existence and client lifecycle in one bounded batch query. Closed-client capabilities are denied before inbox read/write. This local fix still requires migration/deployment and does not solve the post-purge ownership issue below.
- Migration 0094 now retains `client_access_revoked_at` on requests independently of the client FK. Dispatch, communications and inbox access consult the marker; tests remove the FK, retry old tokens, attempt marker clearing and digest restoration, and insert a late request for a closed identity. All remain denied. This migration has only been exercised locally; concurrent closure/write ordering and every background producer still need coverage.

## Still required before destructive purge implementation

1. Complete field-by-field ownership for shared request JSON, consent, communication read state, payment payloads, and all background writers.
2. Specify and test exact redaction SQL, retaining only non-personal accounting data unless a documented record-specific legal obligation applies.
3. Verify permanent request-capability denial after account/ownership fields are removed.
4. Inventory storage outside the database (backups, logs, exports and device caches); verify replay protection after backup restoration. A source-only scan does not establish hosted retention settings.
5. Exercise real migrations with realistic synthetic relationships, not only minimal closure fixtures, before enabling any worker.
