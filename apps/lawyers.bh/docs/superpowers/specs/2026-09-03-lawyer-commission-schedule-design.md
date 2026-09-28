# Lawyer Commission Schedule Design

## Goal

Apply a 20% platform commission during the first calendar year after a lawyer's
approval and a 45% platform commission from the start of the second year, while
preserving the commission applied to every completed financial transaction.

## Authoritative date and boundary

The lawyer's durable approval timestamp (`bahrain_lawyers.reviewed_at`) is the
schedule start. The first-year rate applies from that timestamp, inclusive,
until the same timestamp plus PostgreSQL `INTERVAL '1 year'`, exclusive. The
45% rate applies at that anniversary and afterward. New approvals must keep the
original approval timestamp when approval or Tap onboarding is retried.

## Commission schedule and snapshots

Each approved lawyer has two effective-dated rows in
`bahrain_provider_commission_rates`: 20% platform / 80% lawyer for the first
year, followed by 45% platform / 55% lawyer. A migration updates existing
active second-year schedule rows from 50/50 to 45/55 and anchors them to the
lawyer's stored approval anniversary where possible.

`bahrain_payment_allocations` remains the immutable transaction snapshot. At
successful payment capture, the backend selects the rate effective at
`captured_at` and stores the rate id, both percentages, and both calculated
amounts. The migration must not update historical allocation percentages or
amounts.

## Contract copy

Both the public registration agreement and complete-profile agreement state in
Arabic and English that the platform receives 20% during the first year from
registration and account approval, and 45% beginning with the second year.
The wording must be contractual and must identify platform-processed work as
the commission base.

## Interfaces and displays

The administrator approval API reports 20/80 for the first year and 45/55
afterward. Existing payout displays continue reading the stored allocation
snapshot and therefore require no retroactive calculation.

## Verification

Tests cover SQL schedule creation, the exact anniversary boundary, the updated
approval API response, both agreement copies, migration safety, and immutable
allocation snapshots. Run focused Vitest tests, the complete test suite,
TypeScript/Next build without migrations, ESLint on changed files, and
`git diff --check`. Do not deploy or apply the production migration.
