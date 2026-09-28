# Admin Mobile Notifications Design

## Goal

Add an admin page that sends immediate bilingual Firebase notifications to selected iPhone app audiences: client members, active approved lawyers, pending lawyers, all lawyers, or everyone.

## Reachability Definition

"Installed users" means iPhone installations that granted notification permission and supplied a current FCM token to the platform. Devices that denied notification permission, uninstalled the app, or have an invalid token cannot receive a push notification and are not counted as reachable. Invalid Firebase tokens are removed when detected during delivery.

## Audience Model

Each row in `bahrain_mobile_push_installations` represents one FCM installation token and has one current audience role:

- `client`: the app is currently operating as a client/member installation.
- `lawyer`: the installation is authenticated with a lawyer account and has a `lawyer_id`.

The new role field is authoritative for broadcasts. A lawyer login changes the installation to `lawyer` and binds the lawyer ID. Lawyer logout changes it back to `client` and clears the lawyer ID. Token refresh updates the existing installation rather than creating a duplicate.

The selectable audiences are:

- `clients`: all reachable installations whose current role is `client`.
- `active_lawyers`: lawyer installations joined to a lawyer with `status = 'approved'` and `is_active = true`.
- `pending_lawyers`: lawyer installations joined to a lawyer with `status = 'pending'`.
- `all_lawyers`: all current lawyer installations regardless of lawyer application status.
- `everyone`: the union of client and lawyer installations.

Every audience query deduplicates by FCM token. The `everyone` audience therefore sends at most one notification to each token.

## iPhone App Registration

The existing startup coordinator already requests notification permission and obtains the FCM token. Extend it so that, after permission is granted, it registers the installation as a client through a new public best-effort endpoint whenever no lawyer session exists. The registration includes only token, platform `ios`, and locale.

When a lawyer session exists or a lawyer logs in, the existing authenticated lawyer endpoint updates the same token to role `lawyer`. On lawyer logout, the authenticated delete operation changes the same token back to role `client` instead of leaving an unclassified row. FCM token refresh repeats the registration for the current role and locale.

Client installation registration must never block app startup. The server validates token length, platform, and locale, applies request rate limiting, and performs an idempotent upsert. This phase supports iPhone only; Android is rejected and remains out of scope.

## Database Changes

Add a migration that:

- Adds a non-null `audience_role` column to `bahrain_mobile_push_installations`, constrained to `client` or `lawyer`.
- Backfills rows with a non-null `lawyer_id` as `lawyer` and all other rows as `client`.
- Adds an index supporting role-based audience selection.
- Adds `bahrain_admin_mobile_notification_sends` for the audit history.

The send-history table stores:

- sender admin ID;
- audience key;
- Arabic and English title/body;
- unique idempotency key;
- targeted, successful, failed, and pruned-token counts;
- created, started, and completed timestamps;
- final state `sending`, `completed`, or `failed`.

It does not store device tokens or user identities.

## Admin Authorization

Add a dedicated `manage_notifications` permission. Active super-admins retain implicit access. Normal admin accounts require the explicit permission. Reviewer defaults do not receive it. Add the permission to admin creation/editing labels, profile labels, and dashboard card filtering.

Both preview and send APIs enforce `manage_notifications`; hiding the page is not an authorization boundary.

## Admin Page

Create `/{locale}/admin/mobile-notifications` with the same bilingual admin visual language as the existing dashboard.

The page contains:

- audience selector with the five audience choices;
- Arabic title and body fields;
- English title and body fields;
- character counters and server-aligned limits;
- a preview action that returns the current unique reachable-device count;
- localized notification previews;
- a review modal showing audience, count, and both messages;
- an explicit irreversible-send confirmation;
- a disabled send button while a request is active;
- a recent-send history table with sender, audience, time, and delivery counts.

All four content fields are required. Whitespace is normalized. Titles are limited to 100 characters and bodies to 500 characters. Raw HTML is not accepted.

## APIs

### Client installation

`PUT /api/mobile/push/client`

- Public, rate-limited, iOS-only, and idempotent.
- Accepts `token`, `platform`, and `locale`.
- Inserts a new token as `client`. For an existing token, it updates locale and last-seen data but never downgrades an existing `lawyer` role; only the authenticated lawyer logout operation may change a lawyer installation back to `client`.
- Returns HTTP 204 on success.

### Audience preview and history

`GET /api/admin/mobile-notifications`

- Requires `manage_notifications`.
- With an audience query, returns the unique reachable token count.
- Also returns recent audit records without tokens or user identities.

### Send

`POST /api/admin/mobile-notifications`

- Requires `manage_notifications`.
- Validates audience, all localized content, an explicit confirmation flag, and a client-generated UUID idempotency key.
- Creates the audit record before Firebase delivery.
- Reusing an idempotency key returns the existing result and never sends twice.
- Resolves the audience again at send time so the actual count is authoritative.
- Sends in Firebase multicast batches of at most 500 unique tokens.
- Selects Arabic, English, or Turkish-device fallback content by installation locale: Arabic devices receive Arabic; all other supported locales receive English because this page collects Arabic and English only.
- Uses `notification` title/body plus data `{ type: 'admin_broadcast', notificationId: '<audit id>' }`.
- Prunes permanently invalid tokens and records delivery totals.

The API response reports targeted, successful, failed, and pruned counts. Partial Firebase failures do not resend successful tokens automatically.

## Delivery Safety

- The admin must preview and then explicitly confirm before the UI calls the send API.
- The server requires `confirmed: true`; it does not trust the UI alone.
- Idempotency prevents repeat sends caused by double clicks or network retries.
- The server uses the authenticated admin ID for the audit row.
- Tokens never appear in API responses, page HTML, audit history, or logs.
- Logs include only notification ID, audience, aggregate counts, and sanitized Firebase error codes.
- No scheduling, attachments, links, rich media, or Android support is included in this version.

## Foreground and Tap Behavior

Firebase displays notification messages when the app is backgrounded. Add an app-level foreground listener so an admin broadcast received while the app is open is visibly presented to the user. Tapping the notification opens the normal app home flow; custom deep links are out of scope.

If foreground display requires a local-notification package, add and configure it only for iOS and test the permission and presentation behavior on an iPhone simulator/device in addition to unit/widget tests.

## Testing

### Backend

- Permission normalization and authorization for `manage_notifications`.
- Client installation role transitions and idempotent token refresh.
- Audience SQL/persistence behavior for all five audiences and token deduplication.
- Active lawyer filter requires both approved status and active account.
- Pending filter excludes approved, rejected, and suspended lawyers.
- Locale-specific Firebase payloads and 500-token batching.
- Invalid-token pruning and aggregate delivery counts.
- Send idempotency and explicit confirmation.
- No token leakage in API/history responses.
- Admin UI validation, preview, modal confirmation, disabled in-flight state, success counts, and error state.

### iPhone app

- Startup client registration after granted permission.
- No registration when permission is denied or token is absent.
- Lawyer login changes the current role to lawyer.
- Lawyer logout returns the installation to client.
- Token refresh registers the current role and locale.
- Foreground admin broadcast presentation.

Run focused tests first, then backend TypeScript/lint/full tests and Flutter analyze/tests. Actual push delivery requires configured Firebase credentials and simulator/device evidence; local mock success alone is not live-delivery evidence.

## Deployment

Implementation does not authorize database migration, web deployment, App Store/TestFlight release, or live bulk notification sending. Before production rollout, verify the target database, apply the migration through the approved deployment process, deploy the backend, distribute the updated iPhone app, and perform a controlled test notification to a small verified audience.
