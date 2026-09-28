# Approved Lawyer Membership Numbers

## Goal

Guarantee that every approved Bahrain lawyer has a unique official platform membership number and that the approvals UI displays it immediately after approval.

## Behavior

- A pending lawyer receives a membership number from `bahrain_lawyers_membership_no_seq` during approval, using the existing `LBH-` plus six-digit format.
- The approval response remains the source of truth for the newly allocated number.
- The approvals client merges the returned `membershipNo` into its local application card before refreshing.
- Existing membership numbers are never changed.
- A migration assigns numbers to every historical row whose status is `approved` and whose membership number is null or blank.
- Pending, rejected, and suspended rows are not backfilled.
- A database check constraint prevents a future `approved` row from having a null or blank membership number.

## Backfill Safety

The migration locks the Bahrain lawyers table against concurrent approval writes, advances the official sequence to at least the greatest existing numeric membership suffix or its current value, and allocates one distinct sequence value per eligible historical row in deterministic creation order. The existing unique membership index remains the final collision guard.

## Testing

- Test that the client state merge stores the returned number only on the approved application.
- Test that null response data does not erase an existing number.
- Test membership formatting for sequence values.
- Add migration verification that no approved row lacks a number and no numbers are duplicated.
- Run the full test suite, TypeScript, ESLint, and migration diff checks.

## Release Boundary

The migration and UI fix are prepared locally. They are not applied or deployed to production without separate authorization.
