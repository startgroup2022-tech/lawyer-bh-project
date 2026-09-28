# Mobile Review Lawyer Visibility Design

## Goal

Allow the existing Habib Mohammed App Review lawyer account to appear in the
LegalSOS mobile lawyer search during the current review/testing period, while
keeping it hidden from the public website and isolated from real SOS work.

## Design

The mobile directory route will keep review accounts excluded by default. A
server-side environment allowlist will contain the IDs of review accounts that
may appear in the mobile directory. The current Habib account ID can be added
to that allowlist in production and removed when the app is published.

The allowlist affects only `GET /api/mobile/lawyers`. It must not be shared with
or consulted by public website queries, SOS candidate selection, notifications,
lawyer pickup polling, or case acceptance. Those boundaries continue to reject
every review account.

The API response will not expose the `isReviewAccount` marker. A malformed or
missing allowlist means no review account is visible, preserving the current
safe default.

## Configuration

Use `MOBILE_DIRECTORY_REVIEW_LAWYER_IDS` as a comma-separated list of exact
lawyer UUIDs. Whitespace and empty entries are ignored. No email, phone,
license number, or password is stored in configuration.

For the present test period, production will contain only the Habib account ID:
`3ee97030-bc1a-47c1-b06c-bd2b1acee637`.

To stop showing the account before publication, remove that ID (or the entire
environment variable) and redeploy. No database change is required.

## Query and Response Flow

1. Resolve and validate the requested active country as today.
2. Query active, approved lawyers for that country.
3. Include normal lawyers unconditionally.
4. Include a review lawyer only when its exact ID is in the mobile-directory
   allowlist.
5. Strip the internal review marker and return the existing response shape.

Filtering must be enforced in the database query and repeated defensively on
the returned rows.

## Tests

Tests will prove that:

- a specifically allowlisted review lawyer appears in the mobile directory;
- an unlisted review lawyer remains hidden;
- normal active, approved lawyers remain visible;
- missing or malformed configuration fails closed;
- website, dispatch, notification, polling, and acceptance isolation checks
  remain unchanged and passing.

## Out of Scope

- Making the review lawyer eligible for real SOS requests.
- Showing the account on the public website.
- Changing authentication, profile data, payment behavior, or Flutter UI.
