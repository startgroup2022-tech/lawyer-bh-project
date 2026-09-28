# Provider Dashboard Card Navigation Design

## Goal

Replace the website provider dashboard's tab-style navigation with an admin-dashboard-style landing page containing three large cards. Each card opens a dedicated page while preserving the existing provider APIs, authorization rules, payment behavior, and profile workflows.

## Information Architecture

The provider dashboard landing page at `/{locale}/provider-dashboard` contains:

1. **My Requests / طلباتي** → `/{locale}/provider-dashboard/requests`
2. **Balances & Payment Links / الأرصدة وروابط الدفع** → `/{locale}/provider-dashboard/balances`
3. **Profile / الملف الشخصي** → `/{locale}/provider-dashboard/profile`

The balances page combines balance creation, existing balances, payment-link creation/copying, invoice downloads, and paid receipt downloads. Requests and profile remain separate pages.

## Shared Shell

All four provider pages use one shared client-side shell responsible for:

- loading the authenticated provider profile;
- enforcing the existing dashboard access state;
- displaying the localized provider name and profile image;
- displaying logout and back-navigation controls;
- rendering Arabic RTL and English LTR consistently;
- presenting session, profile-load, and section-load errors separately.

The dedicated section pages receive the authenticated profile from the shell and load only their own data. Opening the profile page must not fetch requests or balances. Opening requests must not fetch balances.

## Landing Page Cards

Cards follow the admin dashboard visual language: white background, rounded 3XL corners, subtle border and shadow, a tinted icon tile, title, short description, and directional affordance. The grid is one column on small phones, two columns on medium screens, and three columns on large screens. Hover elevation is applied only on pointer-capable devices.

The requests card may display the confirmed paid-request count only if that count is already available without exposing request data. Otherwise it displays descriptive copy and the count remains on the requests page to avoid duplicate fetching.

## Dedicated Pages

### Requests

Preserve paid/CAPTURED server gating, search, source/status filters, statistics, pagination, and request-detail links. The page owns request loading and request-specific retry errors.

### Balances & Payment Links

Preserve the balance form, country-derived currency, customer details, balance table, Lawyers.bh payment-link creation, copy action, invoice PDF, receipt PDF after CAPTURED payment, refresh, and pagination.

### Profile

Preserve profile editing, specialties, contact changes, email verification, password fields, files, renewal controls, validation, and approval-state messages.

## Routing and Compatibility

- Existing direct URL `/{locale}/provider-dashboard` becomes the card landing page.
- New pages are bookmarkable and refresh-safe.
- Existing provider API routes are unchanged.
- Existing request detail routes remain unchanged.
- No mobile app, database, payment, or public directory behavior changes.

## Accessibility and Localization

- Cards are semantic links with visible focus states.
- Titles and descriptions are fully bilingual.
- Icons are decorative unless they convey unique meaning.
- Arabic uses RTL layout and English uses LTR layout via the existing locale framework.
- Touch targets remain at least 44px high.

## Testing and Verification

- Unit tests for the three-card route catalog in Arabic and English.
- Navigation assertions for all card destinations.
- Component or structural tests proving each section page renders only its own section mode.
- Regression tests for request, balance, and profile helpers already in scope.
- TypeScript and the safe Next.js build.
- Browser verification at phone and desktop widths for the landing page and each dedicated page before deployment.
