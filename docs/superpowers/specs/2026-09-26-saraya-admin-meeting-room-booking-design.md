# Saraya Admin Meeting-Room Booking Design

## Goal

Enable Saraya Square management to create meeting-room bookings on behalf of any active tenant or owner user assigned to the selected property.

## User Experience

- The `Add booking` button remains clickable for management even when no room is active.
- When no active room exists, clicking the action shows a localized explanation asking management to activate a room first.
- When an active room exists, the booking dialog loads all active property users whose role is `tenant` or `owner`.
- The dialog requires a booking user, active room, start/end time, attendee count, and purpose.
- Booking cards show the selected user's localized name and role.

## Architecture

The existing meeting-room bookings endpoint exposes a management-only `targets=true` list containing eligible users. Administrators submit an optional `bookedForUserId`; the service accepts it only from `super_admin` or `property_manager`, verifies the target has an active owner/tenant membership in the same property, and derives any tenant organization link server-side.

The booking continues to store the selected user in `booked_by_user_id`. The audit event records the authenticated manager as the actor, separating who made the booking from whom the booking belongs to. No schema migration is required.

## Security and Validation

- Only property management may list booking targets or book on behalf of another user.
- The selected target must be an active Saraya user with an active tenant or owner membership in the selected property.
- Existing room status, operating hours, capacity, minimum duration, increment, overlap, and future-time checks remain unchanged.
- Tenant organization IDs are derived from the selected user's linked contact and are never trusted from the client.

## Testing

- Backend tests cover management target listing, cross-property rejection, on-behalf booking, tenant linkage, and actor audit input.
- Flutter tests cover target loading, request serialization, enabled button behavior, no-active-room feedback, user selection, and refresh.
- Run TypeScript checks, focused backend tests, Flutter analysis/full tests, local web build, and browser verification without creating a booking.

## Constraints

- Preserve existing room management, booking decisions, overlap protection, bilingual RTL/LTR behavior, and unrelated dirty work.
- Do not commit, deploy publicly, or create real booking data during verification.
