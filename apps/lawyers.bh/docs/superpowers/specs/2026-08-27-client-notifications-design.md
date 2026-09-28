# Client notifications

Approved: a real client inbox with All/Unread, read-one/read-all, request/message navigation, Arabic RTL and light/dark. Profile opens **notification settings**, not the inbox. Settings reports OS authorization and opens device settings; it does not pretend that a local switch changes delivery.

Database events capture payment/service transitions, lawyer messages and completed client/everyone admin broadcasts. Request events require the existing per-request dispatch capability; message content remains behind the separate communication credential and is not copied into notifications. Admin broadcasts require an authenticated client session. Request read state belongs to the request capability; announcement read state belongs to the authenticated client. No ownership inferred from name, email or phone.

Events recorded after migration are durable. Existing lawyer messages and completed public client broadcasts can be backfilled from their actual timestamps; no invented historical request transitions. Event writes are transactional with source writes. Deleted requests cascade. Tokens never enter URLs or logs.

The app refreshes on opening/resuming/pull-to-refresh, paginates, and shows errors instead of fake data. Tapping a completed request must not reopen sending; communication access is checked again. System push delivery, APNs and deployment remain distinct from inbox availability. No production migration or deployment in this task.
