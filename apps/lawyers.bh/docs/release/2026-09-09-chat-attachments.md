# LegalSOS attachment repair

Scope approved: publish attachment endpoints and schema only; no Apple/Google release.

Root cause: production GET `/api/mobile/communications/<uuid>/attachments/<uuid>` returned 404 while the sibling messages endpoint returned 403 for the same anonymous probe. Attachment implementation existed only in an uncommitted older checkout, absent from current DEV/PRODUCTION. Production message serialization also omitted attachment metadata.

Repair: restore private chunked PUT/GET route and signature validation, return attachment metadata in message history, and add ordered migration 0085 (journal 76), after current production migration 0084. No existing migrations rewritten. No change to payments, account deletion, phone numbers, or mobile binaries.

Verification before publishing: 68 tests passed across communications access, attachment policy, route authorization, messages and a real local PostgreSQL round trip. The round trip verifies multi-chunk bytes, replay without duplicate messages, rejection of uploads after completion and continued authorized downloads. The metadata regression test failed before the serialization fix and passed afterward. TypeScript passed. Migration rehearsal used temporary tables and ROLLBACK; no production data touched during rehearsal.

Runtime device upload remains to be checked after deployment. Do not equate a 403 unauthenticated endpoint check with a successful authenticated attachment upload.
