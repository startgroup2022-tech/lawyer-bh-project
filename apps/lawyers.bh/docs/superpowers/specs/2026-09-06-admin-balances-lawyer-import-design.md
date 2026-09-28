# Admin balances and lawyer Excel import

## Scope

- Remove drop shadows from the provider dashboard navigation cards while preserving the existing borders, colors, spacing, typography, RTL/LTR behavior, and focus states.
- Add an admin finance page backed by `provider_customer_balances` as the single source of truth.
- Add an admin lawyer-import page that accepts an Excel workbook and creates pending lawyer invitations.

## Admin balances

The admin dashboard receives a finance-permission card linking to a dedicated balances page. The page uses the existing site visual language and supports search, status/provider filters, pagination, totals, balance creation on behalf of a lawyer, payment-link creation/copying, and access to invoices and receipts. It also shows each lawyer's full payment-link history with customer, amount, status, timestamps, reference, and payment state.

All API routes require `manage_finance`. They read and write the existing provider balance rows; no duplicate balance or history table is introduced.

## Lawyer import

The admin dashboard receives a `manage_lawyers` card linking to a dedicated upload page. Accepted columns are Arabic name, optional English name, phone, and email. The importer validates file type and size, normalizes values, processes rows independently, and never aborts the remaining rows because one row is invalid.

New rows reuse the existing invitation lifecycle: inactive account, incomplete profile, expiring invite token, generated membership number, and invitation email. A row whose normalized Arabic name and email both match an existing lawyer is skipped. Other database conflicts and email-delivery failures are reported per row.

The final result shows counts for successful, skipped, and failed rows and a detailed table containing every non-successful row and its reason. Server permissions remain authoritative.

## Verification

- Focused unit tests cover permissions, filters, balance creation and link creation, Excel validation, duplicate skipping, partial success, and row-level reporting.
- Type checking and the safe Next.js build run without database migrations.
- Existing Saraya worktree changes are excluded from all edits and commits.
