# Country Consultation Catalogues and Visual Icon Picker Design

## Goal

Upgrade consultation administration so each provisioned active country owns an independent consultation catalogue and administrators choose icons visually. Appointment booking must use the customer's selected country and show only that country's active types, prices, currency, durations, and icons.

## Administration Layout

Match the Admins and Permissions page structure: a create/edit panel on one side and the managed list on the other at desktop widths, collapsing to one column on mobile. Cards use `border-transparent` at rest and the same red hover/focus border, radius, spacing, and shadow as admin-user cards.

A country selector sits above both panels. It loads only active, table-provisioned countries from the protected admin countries endpoint. Each option shows the localized country name, ISO code, and currency. Changing country clears edit/form state, loads that country's catalogue, and updates the form currency default. Loading, empty, and failure states are bilingual.

## Country Isolation

Every admin read and mutation carries the selected ISO country code. The server resolves it through `getActiveCountry` and derives the consultation table through `buildCountryTableSet`; neither a client-provided table prefix nor table name is accepted. Create, update, reorder, archive, restore, and delete affect only the resolved country's table.

Consultation codes need only be unique within a country. A code such as `phone` may have different names, duration, icon, and price in Bahrain and Saudi Arabia. Historical bookings continue retaining their stored country and method code.

## Visual Icon Picker

Replace the icon-key text input with an accessible visual picker backed by an explicit allowlist of consultation-relevant Lucide icons. The picker opens a searchable grid showing each icon and its bilingual label. The current selection is highlighted and previewed beside the field, in managed-list cards, and in booking cards.

The allowlist includes communication, meeting, office, location, home, document, chat, headset, calendar, scales, shield, and video-related choices. It is deliberately explicit rather than importing every Lucide export into the client bundle. The server validates the chosen key against the same shared allowlist; unknown keys are rejected. Existing stored keys are mapped to their matching icons, with a neutral fallback for legacy unknown values.

## Customer Country Selection

Appointment booking adds a country selector populated from the existing public countries API using the website channel. Bahrain is the initial fallback only when no valid customer selection exists. The chosen country is kept in the booking state and persisted in the payment draft so page transitions do not silently revert it.

Changing country clears the currently selected consultation type, lawyer, date, and time, then reloads consultation methods and available lawyers for the new country. The booking page never substitutes Bahrain methods or prices when another country has no active catalogue; it shows a localized empty-state message instead.

The consultation catalogue request, available-lawyers request, discount quote, Tap charge, YourGPT payment session where applicable, and stored booking payload all receive the same ISO country code. Server-side price resolution remains authoritative and rejects a method that is missing or archived in that country.

## Data and API Shape

The public consultation API already accepts `countryCode`; it continues returning the country currency and adds no duplicated pricing logic. Admin API responses add localized country metadata as required by the selector. Icon keys remain stored in the existing `icon_key` column, so this enhancement requires no destructive schema change.

## Error Handling

- Inactive or unprovisioned country: `404 country_not_active`.
- Icon not in the shared allowlist: `400 invalid_icon`.
- Method not active in the selected country: reject before creating a charge.
- Country changed while editing: discard the edit and require a fresh selection.
- Catalogue empty: show an empty state and disable progression, without Bahrain fallback.
- Public country/catalogue request failure: show retry copy and prevent a potentially mispriced booking.

## Testing

Use test-first development to verify:

- the shared icon allowlist, validation, fallback, and icon rendering;
- country selector loading and form reset behavior;
- admin requests consistently carry the selected country;
- identical method codes remain isolated between two country tables;
- booking fetches methods and lawyers for the selected country;
- country changes clear dependent booking selections;
- empty country catalogues do not fall back to Bahrain;
- payment drafts, discount quotes, Tap charges, and YourGPT sessions preserve the same country code;
- responsive two-column admin layout and Admins and Permissions card styling;
- TypeScript, focused lint, relevant Vitest suites, and a production build with migrations.

## Out of Scope

- Uploading custom SVG or raster icons.
- Automatically copying Bahrain's catalogue into another country.
- Exchange-rate conversion between currencies.
- Changing completed bookings or captured charges when an administrator edits a price.
