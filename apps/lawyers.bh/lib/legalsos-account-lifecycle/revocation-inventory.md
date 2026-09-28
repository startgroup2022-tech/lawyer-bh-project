# App closure scope (not the complete purge inventory)

Verified against current schema, client-auth migrations, mobile-push-store and communications/server-access.

- Client identity: `mobile_client_accounts.id`. Retain the row and personal fields during the restricted retention window. Never delete at closure.
- Client credentials: revoke `mobile_client_sessions.client_id` and `mobile_client_challenges.client_id`, plus challenges for the account's current email (covers registration/reset challenges without client_id).
- Client request ownership: `bahrain_emergency_requests.client_account_id`. Null only `mobile_request_access_digest`. HMAC dispatch tokens must additionally consult lifecycle. Preserve request service/payment/refund statuses, amounts, charge IDs, assignment and contact fields for settlement.
- Lawyer identity: `bahrain_lawyers.id` is shared with the website. Do not delete or modify email, password_hash, status, is_active, documents or professional fields. The separate lifecycle record denies LegalSOS access.
- Lawyer device ownership: `bahrain_mobile_push_installations.lawyer_id`. Delete request subscriptions belonging to those installations first, then those installations. Client installations have no client account ID: unlink owned request subscriptions rather than guessing installation ownership.
- Call push registrations: lawyer ownership is actor_role=lawyer + actor_id=lawyer UUID. Client ownership is actor_role=client + request_id in owned requests; client actor IDs are `client:<request UUID>`, NOT account UUIDs. Preserve the other participant's registration.
- Settlement references: a new lifecycle/request pair for active, disputed or financially pending requests; no implicit cancellation, refund, completion or change of assigned lawyer. Queue neutral follow-up notification references without copying message text or contact information.
- Messages, attachment bytes, profile documents, payment payloads, call/signalling history, location traces, legal acceptances and backups are NOT deleted by closure. Their complete ownership/retention inventory is required before implementing final purge.

This transaction alone is not release-ready: remaining legacy token/cookie/job paths, notification sending, admin UI, purge and user interfaces must still be completed and tested before exposure.
