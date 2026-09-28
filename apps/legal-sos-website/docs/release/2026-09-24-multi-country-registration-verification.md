# LegalSOS Multi-Country Lawyer Registration — Verification

Date: 2026-09-24
Scope: Bahrain (`BH`) and Saudi Arabia (`SA`), phase-one lawyer registration.

## Outcome

The implementation is locally release-ready, subject to the controlled database-first release sequence below. Bahrain applications route to `bahrain_lawyers`; Saudi applications route to `saudi_lawyers`. Both countries are visible in the shared Lawyers.bh administration application queue, while the public Lawyers.bh lawyer directory remains Bahrain-only.

Saudi approval intentionally does not create a record in the Bahrain-only Tap retailer onboarding table. It completes provider approval and commission creation without Tap onboarding. Bahrain approval retains the existing Tap onboarding workflow.

## Local verification

| Area | Evidence | Result |
| --- | --- | --- |
| LegalSOS website tests | 12 files, 42 tests | Passed |
| LegalSOS website TypeScript | `tsc --noEmit` | Passed |
| LegalSOS website lint | ESLint | Passed with 0 warnings |
| LegalSOS website production build | Next.js, 33 routes/pages | Passed |
| Lawyers.bh focused multi-country suites | 9 files, 38 tests, serial execution | Passed |
| Saudi approval/Tap safeguard | 3 files, 8 tests | Passed |
| Lawyers.bh TypeScript | `tsc --noEmit` | Passed |
| Lawyers.bh production build | Next.js, 193 routes/pages | Passed using the valid local PostgreSQL URL |
| Flutter focused tests | Admin queue, request assignment, profile entry: 11 tests | Passed |
| Flutter focused analysis | Three affected screens | No errors or warnings; 39 existing info-level notices in the pre-existing profile-screen work |

The first Lawyers.bh build attempt detected invalid redacted URL values in `.env.production.local`. No secret was printed or changed. The successful build explicitly used the valid localhost PostgreSQL configuration from `.env.local`.

## Database verification

Migration `0109_country_scoped_legalsos_lawyer_terms.sql` and its verifier were executed against the localhost PostgreSQL database inside one transaction. The transaction was rolled back after verification, leaving no persistent change.

Verified state inside the transaction:

- One published `legalsos_lawyer_agreement` for `BH`.
- One independently scoped published agreement for `SA`.
- `bahrain_lawyers` exists.
- `saudi_lawyers` exists.
- No unscoped LegalSOS lawyer agreement remained.

Production migration status: **not applied**.

## Git evidence

Implementation commits on local `DEV`:

- `b350c7f` readiness verification
- `6d6f8d5` shared country-aware registration
- `cd75852` LegalSOS registration endpoint
- `49d0db6` country-scoped agreements and migration 0109
- `73ccaad` country-aware registration form
- `8416bff` country-aware administration queue and actions
- `88183de` Bahrain-only public directory contract
- `e6b4ef6` standardized Arabic “محامي” terminology
- `6a433bd` Saudi approval without Bahrain-only Tap onboarding

The Flutter terminology update is committed separately as `c79b270`. Unrelated dirty Flutter and website work was preserved and excluded from these commits.

## Deployment and live evidence

- Preview deployment: **not performed**. No isolated preview database with migration 0109 was available. Deploying the new agreement queries before the database migration would be unsafe.
- Production deployment: **not performed**.
- Production migration: **not performed**.
- Live Bahrain/Saudi registration: **not performed**; no external test identity was created.
- Live admin authentication/filtering: **not yet verified**.
- Live email delivery and file storage: **not yet verified**.

## Required controlled release order

1. Confirm the production Neon database is writable and has sufficient quota.
2. Apply migration 0109 and run its verifier.
3. Deploy Lawyers.bh backend/admin from the approved `DEV` revision and verify country catalogue, agreements, registration validation, admin filtering, and public Bahrain isolation.
4. Deploy the LegalSOS website and verify Bahrain/Saudi form routing.
5. Only after separate approval, submit one controlled Bahrain registration and one controlled Saudi registration with named test identities and marketing consent disabled.

This order requires explicit production release approval before step 2.
