# Country Admin Visual Refresh Design

## Goal

Restyle the Country Management page to match the Admins & Permissions visual system while preserving every existing country-management behavior.

## Approved Layout

- Keep the shared admin route header supplied by the admin layout.
- Use the standard `#F7F8FA` admin background, responsive page padding, and `max-w-7xl` content width.
- Add a red gradient hero matching Admins & Permissions with a Globe icon, bilingual title and description, and an active-country count.
- Place search in a dedicated white surface with a transparent default border, soft shadow, and red hover/focus border.
- Render countries in a responsive one-, two-, or three-column card grid.

## Country Cards

- White `rounded-3xl` cards with transparent borders, soft shadows, and red hover/focus borders.
- A fixed-height wide background preview. When no image exists, show a neutral placeholder with a Globe icon.
- Country name, ISO code badge, currency badge, and clear service-readiness status.
- Website URL input styled like Admins & Permissions inputs.
- App and website switches displayed in separate muted rows with clear enabled/disabled state.
- Background upload presented as a dashed upload control with accepted formats and 4 MB limit.
- Per-country saving state disables its controls and shows a spinner/status without disabling unrelated country cards.

## Feedback States

- Success notices use the standard green bordered alert.
- Errors use the standard red bordered alert and retain the reload action.
- Loading uses a centered red spinner.
- Empty search results use a white rounded empty-state card.

## Preserved Behavior

- Load settings from `/api/admin/country-settings`.
- Toggle `appEnabled` and `websiteEnabled` independently.
- Save or clear the HTTPS website URL.
- Upload PNG, JPG, or WebP backgrounds up to 4 MB directly.
- Preserve pagination, Arabic RTL, English LTR, validation, and existing API payloads.

## Out of Scope

- Adding, deleting, or archiving countries.
- Changing DNS, payment readiness, provisioning, database schema, or permissions.
- Changing any public-country selection behavior.
