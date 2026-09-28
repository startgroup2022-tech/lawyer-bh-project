# Admin Approvals Pagination

## Goal

Make the admin approvals list easier to browse by showing ten filtered applications per page with numbered navigation.

## Behavior

- Pagination happens after the existing status filter and text search.
- Each page contains at most 10 applications.
- Navigation includes localized Previous and Next buttons plus up to five consecutive page-number buttons.
- The active page is visually distinct and exposed with `aria-current="page"`.
- Previous is disabled on the first page; Next is disabled on the last page.
- Changing the status filter or search text returns to page 1.
- When a local approval, rejection, suspension, or reactivation reduces the available page count, rendering clamps to the last available page.
- The existing totals continue to describe the complete application set, not the current page.
- Arabic and English layouts remain responsive on narrow screens.

## Architecture

Keep the existing server query unchanged. Add small pure pagination helpers beside the approvals client component, test their boundary behavior, and use them to slice the already filtered list. This avoids changing permissions, database queries, mutations, or search semantics.

## Testing

- Verify ten-item slicing and the final partial page.
- Verify page clamping when the result set shrinks.
- Verify the five-number window at the start, middle, and end.
- Run focused tests, the full test suite, TypeScript, ESLint, and the available build check.

## Release Boundary

Local implementation and verification do not deploy the change to production.
