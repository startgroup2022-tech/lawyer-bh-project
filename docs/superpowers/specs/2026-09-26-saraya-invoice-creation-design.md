# Saraya Invoice Creation Design

## Goal

Allow Saraya Square administrators and accountants to create multiple BHD invoices for an existing rental relationship directly from the invoices page.

## User Experience

- Show an `Add invoice` action in the populated and empty invoice states for roles with `billing:write`.
- The dialog asks for: rental relationship/unit, description, amount, issue date, due date, and initial status (`draft` or `due`).
- The server generates the invoice number; users never type or coordinate invoice numbers.
- A successful save closes the dialog, refreshes the invoice list, and shows localized feedback.
- Validation stays inline and localized. Due date cannot precede issue date, and amount must be a positive BHD value with at most three decimal places.

## Architecture

The Flutter repository posts JSON to the existing `/api/saraya/v1/invoices` route. The Next.js handler authenticates the Saraya principal, requires `billing:write`, validates the selected rental request belongs to the property, inserts the invoice and one immutable invoice item in a transaction, and writes an audit event.

The same endpoint exposes property-scoped invoice targets for the dialog. Each target contains only the rental request id, unit number, and tenant display name required for selection; tenant and financial identifiers remain server-derived.

The existing unique constraint that permits only one invoice per rental request is removed by a forward-only migration. Invoice numbers use the issue year plus a UUID-derived suffix, avoiding sequence races while retaining a recognizable `INV-YYYY-XXXXXXXX` format.

## Data Contract

Input:

- `propertyId`: selected Saraya property UUID.
- `rentalRequestId`: an existing rental request in that property.
- `description`: one user-entered label stored in both Arabic and English item descriptions.
- `amount`: positive decimal string with up to three fractional digits.
- `issueDate`: ISO date.
- `dueDate`: ISO date on or after issue date.
- `status`: `draft` or `due`.

Output is the same invoice record shape used by the current list view, including unit number and zero paid amount.

## Security and Integrity

- Only memberships with `billing:write` may create invoices.
- The server derives the tenant from the rental request; it never trusts a client-supplied tenant identifier.
- Property, rental request, unit, and tenant relationships are verified inside the transaction.
- Amounts remain decimal strings and currency is fixed to `BHD`.
- Invoice and item creation are atomic and append an `invoice.created` audit event.

## Testing

- Backend tests cover permissions, validation, property scoping, generated numbering, and repository inputs.
- Flutter repository tests cover the POST contract and parsed response.
- Widget tests cover button visibility, the creation form, save, and list refresh in English and Arabic-compatible layouts.
- Run focused backend tests, TypeScript validation, Flutter analysis/tests, web build, and browser verification.

## Constraints

- Preserve existing invoice listing, payment links, pull-to-refresh, RTL/LTR behavior, and unrelated dirty work.
- Do not create payment charges when creating an invoice.
- Do not deploy publicly or commit changes.
