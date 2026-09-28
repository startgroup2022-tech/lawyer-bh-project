# Saraya Square Meeting Room Bookings Design

## Goal

Add the two Saraya Square meeting rooms as first-class, property-scoped resources with bilingual details and conflict-safe bookings for authenticated tenants and staff.

## Scope

- Store meeting rooms independently from rentable offices and shops.
- Allow Saraya administrators to create, update, activate, deactivate, and mark rooms under maintenance.
- Allow authenticated property members to view active rooms and availability.
- Allow tenants and staff to request a booking using Bahrain-local date/time, attendee count, and purpose.
- Allow property managers and super administrators to confirm or reject pending bookings.
- Allow the booking owner, property manager, or super administrator to cancel a pending or confirmed booking.
- Keep all rows property-scoped and append an audit record for every booking state change.

## Data Model

`saraya_meeting_rooms` stores bilingual names and descriptions, capacity, hourly BHD rate, operating hours, minimum duration, booking increment, and operational status. Room codes are unique inside a property.

`saraya_meeting_room_bookings` stores the room, booking user, optional tenant organization, half-open start/end timestamps, attendee count, purpose, amount, currency, status, decision details, and an idempotency key. A database trigger serializes writes per room and rejects overlapping pending or confirmed bookings.

Every foreign key that crosses a Saraya resource boundary includes `property_id`, preventing cross-property references.

## Authorization

- All active property members can read rooms and their own booking records.
- Tenants can create bookings only for themselves and their linked tenant organization.
- Property managers and super administrators can view all property bookings and decide pending requests.
- Accountants and maintenance staff have read-only property-wide booking access.
- Owners have property-wide read access but cannot decide bookings unless they also hold a management membership.

## API

- `GET /api/saraya/v1/meeting-rooms?propertyId=...`
- `POST /api/saraya/v1/meeting-rooms?propertyId=...`
- `PATCH /api/saraya/v1/meeting-rooms/:id?propertyId=...`
- `GET /api/saraya/v1/meeting-room-bookings?propertyId=...`
- `POST /api/saraya/v1/meeting-room-bookings?propertyId=...`
- `POST /api/saraya/v1/meeting-room-bookings/:id/decision?propertyId=...`

The create-booking response is `201` with status `pending`. Duplicate retries with the same user and idempotency key return the original booking. Conflicts return `409 BOOKING_TIME_CONFLICT`.

## Validation

- Times must be valid ISO timestamps, start before end, and remain within one Bahrain calendar day.
- Duration must meet the room minimum and align to its booking increment.
- Attendee count must be positive and not exceed room capacity.
- Currency is fixed to BHD with three-decimal fixed precision.
- Only pending bookings can be confirmed or rejected; pending or confirmed bookings can be cancelled.

## Testing

- Migration contract tests cover all tables, property-aware foreign keys, indexes, trigger-based overlap protection, and journal order.
- Service tests cover authorization, validation, idempotency, conflicts, role-scoped listing, and state transitions.
- HTTP tests cover request parsing and bilingual API errors through the existing Saraya handler boundary.

## Deferred Integration

Payment capture, receipts, calendar UI, notifications, and the Flutter screens are separate slices. The booking records preserve amount and status fields so those integrations can be added without replacing this model.
