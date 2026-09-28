# Consultation Types and Prices Admin Design

## Goal

Add a bilingual administration page that manages the consultation catalogue used by appointment booking and payment. Administrators can create, edit, reorder, archive, restore, and permanently delete consultation types. Active additions must become available to customers immediately.

## Scope

- Add an admin dashboard entry and route named "Consultation Types and Prices" / "أنواع الاستشارة والأسعار".
- Manage the existing country-aware consultation catalogue rather than introducing a second source of truth.
- Support Arabic and English names, a stable unique code, price, currency, duration, icon, display order, and active/archive state.
- Apply catalogue changes to new bookings and payment price resolution.
- Preserve historical booking records, which already store the selected consultation method code as text.
- Use the existing admin visual language: borderless cards at rest and a white border on hover.

## Access Control

Introduce `manage_consultation_types` as an independent admin permission. Super administrators retain their existing bypass. The page and every mutation/read API require the same permission. The permission is exposed in the admin permissions editor with bilingual labels.

## Data Model

Continue using each active country's resolved `consultation_methods` table. Add audit fields where absent: `created_by_admin_id`, `updated_by_admin_id`, `archived_at`, and `archived_by_admin_id`. Existing `is_active` remains the customer-visibility switch.

Codes are normalized lowercase identifiers and are immutable after creation because payment and historical booking flows use them as stable keys. Names, price, currency, duration, icon, and order remain editable. Prices must be positive fixed-precision values; duration must be a positive whole number.

## Admin Experience

The page lists active types first and archived types in a separate section. Each borderless card shows bilingual names, code, price/currency, duration, and state. Hovering adds a white border matching the Admin Users and Permissions page.

The add/edit form provides Arabic name, English name, unique code, price, currency, duration, and icon. A new type is active by default and appears in booking as soon as the save succeeds. Existing types can be reordered.

Archive uses one confirmation and removes the type from booking and payment immediately. Restore returns it to the active catalogue. Permanent delete uses two explicit confirmations and is available from the archived section. Deletion removes only the catalogue row; historical bookings retain the stored method code. Attempts to alter an immutable code or create a duplicate code return a clear bilingual error.

## APIs and Data Flow

Protected admin endpoints provide list, create, update, reorder, archive, restore, and delete operations. All writes validate server-side and record the acting administrator. Country table names are resolved through the existing country-table utilities; request input never becomes an SQL identifier.

The public consultation catalogue continues returning only active rows. Booking renders this catalogue dynamically. Payment and discount price resolution must accept any active catalogue code rather than a hard-coded four-code allowlist, then use the database price. Archived or deleted codes are rejected for new payment attempts.

## Deletion and Historical Safety

Booking records store the consultation method as text rather than a foreign key, so deleting a catalogue type does not erase or rewrite past bookings. Historical admin/provider screens continue showing the stored code, with known codes translated where available and unknown/custom codes displayed safely as their stored value.

## Error Handling

- Invalid or missing fields: `400` with a stable validation code.
- Duplicate consultation code: `409`.
- Missing catalogue row: `404`.
- Missing permission: `403`.
- Stale/archived method during booking or payment: existing invalid-consultation response with no charge created.
- Database failure: `500`, generic client message, detailed server log without secrets.

The UI keeps entered form values after a failed save, shows a concise bilingual message, disables duplicate submissions, and reloads catalogue data after successful mutations.

## Testing

Use test-first development for:

- validation and immutable-code rules;
- permission enforcement on the page and all APIs;
- create/edit/archive/restore/delete/reorder service behavior;
- duplicate and missing-row responses;
- active additions appearing in the public catalogue;
- archived/deleted methods being rejected by payment and discounts;
- dynamic method codes replacing payment allowlists;
- dashboard card, permission label, bilingual UI actions, confirmation messages, and required hover styling;
- migration journal order and migration verification SQL.

Run focused tests after each behavior, then the related suite, TypeScript checking, changed-file linting, migration checks, and a production-style Next.js build before release.

## Out of Scope

- Changing prices on historical bookings or completed payments.
- Per-lawyer consultation prices.
- Scheduling or availability rules.
- Managing countries or currencies beyond selecting the country catalogue already supported by the platform.
