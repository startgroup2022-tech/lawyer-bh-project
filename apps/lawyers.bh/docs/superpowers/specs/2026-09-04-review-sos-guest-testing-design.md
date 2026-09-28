# Global Review SOS Testing Design

## Goal

Provide a temporary production test mode for the unpublished LegalSOS app in
which the Habib Mohammed review lawyer account joins the normal pool of
eligible lawyers for every server-confirmed paid mobile emergency request. The
existing ranking continues to select the nearest eligible lawyer.

## Configuration and Safe Default

Use two server-only settings:

- `SOS_REVIEW_TEST_MODE`: enabled only when its normalized value is `true`.
- `SOS_REVIEW_TEST_LAWYER_ID`: the single review lawyer UUID used for testing.

Production will temporarily use lawyer
`3ee97030-bc1a-47c1-b06c-bd2b1acee637`. If either setting is absent or invalid,
the system fails closed to the existing normal production behavior: all review
accounts are isolated and eligible real lawyers receive requests.

The mode must be removed or set to `false` before the app is published.

## Central Test-Mode Policy

A server-only policy module will expose the configured review lawyer ID only
when the mode is explicitly enabled and the value is a valid UUID. Every SOS
exception for a review account must depend on this policy and an exact lawyer
ID match. The setting and review marker are never returned to clients.

Confirmed payment remains mandatory everywhere: `payment_status = 'success'`
and `tap_status = 'CAPTURED'`.

## Emergency Flow

### Candidate selection

When test mode is enabled, the candidate database query includes all normally
eligible real lawyers plus the single configured review lawyer. Other review
accounts remain excluded. The existing active, approved, emergency-ready,
location-sharing, fresh live-location, radius, and distance-ranking
requirements apply equally to Habib. Therefore Habib is returned only when he
is enabled, online, sharing a fresh location, otherwise eligible, and ranked as
the nearest candidate under the existing fallback rules. When the mode is
disabled, the query returns to the existing behavior and excludes every review
account.

### Lawyer polling

The configured review lawyer may poll candidate and active cases only while
test mode is enabled. No other review account gains access. Payment, candidate,
assignment, deadline, country, and ownership filters remain unchanged.

### Acceptance and lifecycle

The configured review lawyer may accept only a current candidate offer while
test mode is enabled. Existing captured-payment, deadline, country, and atomic
assignment checks remain mandatory. Other review accounts remain blocked.

Because this is an App Review test flow, accepting or repairing a case must not
create a provider payout or delayed-settlement allocation for the review
lawyer. Later arrived/completed operations continue to require that the case is
already assigned to the authenticated lawyer.

## Notifications and Data Safety

Only the existing candidate-specific push may notify Habib. No broadcast
audience is widened, and review accounts remain excluded from general lawyer
notifications. Push payloads continue to omit customer phone, exact location,
and payment data.

## Tests

Automated tests will prove:

- missing, false, or malformed settings keep normal production behavior;
- enabled mode adds only the configured Habib account to the normal pool;
- real lawyers remain eligible while test mode is enabled;
- the existing distance ranking selects whichever eligible lawyer is nearest;
- a different review lawyer remains excluded;
- review polling works only for Habib while the mode is enabled;
- acceptance works only for Habib plus a captured, current candidate offer;
- the review acceptance path creates no payout allocation;
- failed payment and expired or mismatched offers remain blocked;
- disabling the mode restores existing review isolation and real-lawyer flow;
- public website and mobile-directory behavior remain unchanged.

## Rollback Before Publication

Set `SOS_REVIEW_TEST_MODE=false` or remove both test-mode settings from
Production, then redeploy. Verify that the normal candidate pool excludes
Habib and that his polling endpoint returns no pickups before publishing the
app.

## Out of Scope

- Allowing unpaid or non-captured requests into dispatch.
- Broadcasting requests to review or real lawyers.
- Showing Habib on the public website.
- Changing Tap payment behavior or customer authentication.
