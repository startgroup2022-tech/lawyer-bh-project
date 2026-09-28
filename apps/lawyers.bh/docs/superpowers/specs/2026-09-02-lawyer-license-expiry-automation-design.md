# Lawyer License Expiry Automation

## Goal

Protect the public directory and request flows from expired lawyer licenses while warning each lawyer early enough to renew. Send one reminder 30 days before expiry and one reminder 7 days before expiry, then deactivate the account on the expiry date.

## Scope

- Bahrain lawyer records in `bahrain_lawyers` that are approved, active, have a valid email address, and have a non-null `license_expiry_date`.
- Localized Arabic or English email based on the lawyer's stored language.
- Automatic deactivation of approved active records whose license expiry date is today or earlier in Bahrain.
- No automatic reactivation. An administrator reviews the renewed license and reactivates the account through the existing approval flow.
- No changes to historical requests, payments, earnings, or provider documents.

## Scheduling and Authorization

Add a protected daily Vercel cron route and schedule it shortly after midnight Bahrain time. The route accepts Vercel's authenticated cron request using the existing `CRON_SECRET` convention and rejects unauthorized calls.

The job receives an explicit Bahrain calendar date internally. Date-only database values are compared as calendar dates, avoiding server-timezone drift. A delayed or retried run always deactivates records with an expiry date less than or equal to the current Bahrain date.

## Reminder Idempotency

Add a `lawyer_license_notifications` table with a uniqueness constraint over lawyer, license expiry date, and reminder kind (`30_days` or `7_days`). A reminder is eligible when the expiry date is exactly 30 or 7 calendar days after the Bahrain run date.

The job reserves the notification row before delivery. Successful delivery records `sent_at`. Failed delivery records the error and remains retryable. A later run may retry an unsent reservation without creating a duplicate. The database constraint protects against concurrent cron invocations.

Changing a lawyer's expiry date creates a new notification cycle because the expiry date is part of the uniqueness key.

## Processing Order

1. Deactivate all approved active lawyers whose license expires on or before the run date. Set `is_active = false`, `suspension_type = 'license_expired'`, a system-generated suspension reason, and timestamps without overwriting an existing unrelated suspension.
2. Find lawyers whose active license expires in exactly 30 or 7 days.
3. Reserve and send each due reminder once, using the existing Postmark sender.
4. Return aggregate counts only. Logs contain record IDs and outcomes but no email addresses or other personal information.

Deactivation is independent of email delivery. A Postmark outage must not leave an expired lawyer visible.

## Email Content

Each email names the lawyer, states the license expiry date and days remaining, asks them to upload or provide the renewed license before expiry, and warns that the account will be deactivated and removed from the public directory on the expiry date. Arabic accounts receive RTL Arabic content; English accounts receive English content.

## Visibility and Access

The public directory already requires approved, active, unsuspended providers. Setting the expiry suspension and `is_active = false` removes an expired lawyer without deleting the account. Existing provider access checks also reject expired licenses; this automation makes the database state and public visibility consistent.

## Failure Handling

- Unauthorized cron calls return 401 and make no changes.
- Database failures return 500 and are logged without secrets.
- An individual email failure is recorded and does not stop other reminders or deactivation.
- Repeated and concurrent runs do not send duplicate successful reminders.

## Testing

- Pure date-selection tests for 30-day, 7-day, expiry-day, overdue, missing-date, and timezone-boundary cases.
- Message tests for Arabic and English content and HTML escaping.
- Job tests proving deactivation, preservation of unrelated suspensions, successful idempotency, retry after delivery failure, and isolation between renewed expiry dates.
- Route tests for cron authorization and aggregate response.
- Migration verification for table shape and uniqueness.
- Focused tests, TypeScript, ESLint, and production build before handoff.

## Release Boundary

Implementation, migration creation, and local verification do not apply the migration or deploy production. Production activation requires applying the migration, configuring/preserving `CRON_SECRET` and Postmark variables, and deploying the `PRODUCTION` branch.
