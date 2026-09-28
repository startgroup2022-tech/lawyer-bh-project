# Unified Admin Pages Design

## Goal

Make every admin page feel like the existing Admins & Permissions page, with a consistent top navigation bar, page shell, spacing, card treatment, bilingual labels, and logout behavior.

## Approved Behavior

- Every internal route under `/{locale}/admin/*` shows a top bar with:
  - a Dashboard button linking to `/{locale}/admin`;
  - the existing Admin logout button.
- The root admin dashboard keeps its Back to Website button and shows the same logout button.
- Detail pages may retain a contextual back button, such as Back to Lawyers or Back to Requests, below the shared top bar.
- Existing authentication and permission checks remain unchanged.
- Arabic pages remain RTL and English pages remain LTR.

## Considered Approaches

### Shared layout header (selected)

Add one route-aware client header to the admin layout. It automatically displays Dashboard or Back to Website according to the current path. This prevents missing buttons and keeps all routes synchronized.

### Repeated header in every page

Edit each page separately. This gives page-level control but duplicates code and makes future visual drift likely.

### Full admin shell migration

Move every page into a new layout that also owns titles, hero sections, and content grids. This would create the strongest uniformity but is too disruptive for pages with large specialized layouts.

## Visual System

- Page background: `#F7F8FA`.
- Content width: up to `max-w-7xl`, with responsive horizontal padding and the same vertical rhythm as Admins & Permissions.
- Top navigation buttons: white card button for Dashboard or Website, red-tinted button for Logout.
- Main cards: white, rounded `3xl`, transparent default border, soft shadow, and red border on hover or keyboard focus, matching Admins & Permissions.
- Inputs: rounded `xl`, neutral border, red focus border/ring.
- Page hero sections should use the existing red gradient treatment when a page already has a hero or is being normalized safely. Pages without a hero will not receive invented statistics or content.
- Mobile: buttons remain visible and wrap without overflow; text may shorten but actions remain labeled and accessible.

## Components

### `AdminRouteHeader`

A client component reads the locale and current pathname. It renders:

- root dashboard: Back to Website + Logout;
- internal admin page: Dashboard + Logout.

It owns the exact button styles and accessible labels.

### Admin layout

The layout renders the shared route header once for all admin routes. Existing page-level duplicate Dashboard and Logout controls are removed to avoid two headers.

### Existing pages

Each page keeps its business UI. Its outer page background, width, spacing, borders, shadows, and hover/focus styles are normalized where they differ materially from Admins & Permissions. Context-specific navigation is retained.

## Error and Logout Behavior

- Logout continues to call `/api/admin/logout` and always redirects to the localized join page.
- A failed logout request still redirects, matching current behavior.
- The shared navigation does not fetch data or change page authorization.

## Coverage

Coverage includes the root dashboard and all current nested admin routes, including deeper record pages. Tests will inventory admin routes, verify that the layout supplies the shared header, verify root-versus-internal navigation behavior, and ensure page-local duplicate headers are removed from the pages that currently contain them.

## Out of Scope

- Redesigning the underlying workflows, forms, tables, or API behavior.
- Changing permissions or adding new admin capabilities.
- Replacing contextual record-level back navigation.
- Publishing before implementation verification and explicit publish authorization.
