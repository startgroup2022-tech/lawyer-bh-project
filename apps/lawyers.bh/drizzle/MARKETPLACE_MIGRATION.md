# Tap Marketplace migration deployment

`drizzle/meta/_journal.json` currently ends at migration `0015`, while later
SQL migrations in this directory were deployed outside Drizzle's journal.
Consequently, `drizzle-kit migrate` and the application's `build` script do
not discover `0027_tap_marketplace_onboarding.sql`.

Do not add only migration 0027 to the journal: a fresh database would then
skip 0016–0026, and an existing database may already contain those manual
changes. Re-baselining the migration journal is a separate infrastructure
change that requires an inventory of the test and production databases.

Until that baseline is completed, apply 0027 explicitly using a reviewed
database URL. Start with Tap's test environment database:

```bash
psql "$TAP_MARKETPLACE_DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -f apps/lawyers.bh/drizzle/0027_tap_marketplace_onboarding.sql

psql "$TAP_MARKETPLACE_DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -f apps/lawyers.bh/drizzle/verify_0027_tap_marketplace_onboarding.sql
```

Run the migration and verifier a second time to prove idempotency. Never use
`DATABASE_URL` implicitly for this manual step. Confirm the host, database,
and Tap environment before setting `TAP_MARKETPLACE_DATABASE_URL`.

Historical payment allocations receive `split_mode = 'legacy'`. This is an
intentional migration sentinel: old allocation rows do not prove that Tap
executed an instant, delayed, or platform-only marketplace transfer. New
marketplace writes must always set `platform_only`, `instant`, or `delayed`
explicitly.

Tap lead, retailer, and destination identifiers are unique within the Tap
environment. This keeps test and live records isolated while preventing
duplicates in either environment.
