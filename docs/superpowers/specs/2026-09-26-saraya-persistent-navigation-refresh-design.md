# Saraya Persistent Navigation and Pull Refresh Design

## Goal

Keep the Saraya Square navigation shell visible and stable while route content changes, and refresh only the current page data when the user pulls down.

## Architecture

- Move authenticated routes under one `ShellRoute`.
- Build `AppShell` once around the shell navigator and derive the selected path and title from the current URI.
- Keep authentication and login routes outside the shell.
- Preserve each screen's repository/controller refresh callback; `RefreshIndicator` refreshes data without browser reload or route replacement.
- Empty states remain scrollable with always-scrollable physics so pull-to-refresh works with zero records.

## Acceptance Criteria

- Navigating between authenticated pages does not replace the shell element.
- Desktop side navigation, medium rail, and mobile bottom navigation remain mounted.
- Pull-to-refresh issues only the active page's data request.
- Empty list pages can still trigger pull-to-refresh.
- Browser URL and back/forward navigation continue to work.
- Arabic RTL and English LTR layouts remain unchanged.
