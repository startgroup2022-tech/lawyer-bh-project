# Saraya Admin Meeting-Room Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use test-driven development and execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Saraya management create a meeting-room booking for any active tenant or owner user in the property.

**Architecture:** Add a management-only booking-target query to the existing endpoint and an optional `bookedForUserId` create field. The service validates and resolves the selected user server-side, while Flutter loads targets into the existing booking dialog and refreshes the booking list after creation.

**Tech Stack:** Flutter/Dart, Dio, Next.js Route Handlers, TypeScript, Drizzle, PostgreSQL, Vitest.

## Global Constraints

- Preserve all existing booking time, room, capacity, overlap, and decision rules.
- Only `super_admin` and `property_manager` can book for another user.
- Eligible users are active `tenant` or `owner` memberships in the same property.
- Do not commit, deploy publicly, or create real booking data during browser verification.

---

### Task 1: Backend booking targets and on-behalf creation

**Files:**
- Modify: `apps/lawyers.bh/lib/saraya/meeting-rooms/contracts.ts`
- Modify: `apps/lawyers.bh/lib/saraya/meeting-rooms/service.ts`
- Modify: `apps/lawyers.bh/lib/saraya/meeting-rooms/repository.ts`
- Modify: `apps/lawyers.bh/lib/saraya/meeting-rooms/http.ts`
- Modify: `apps/lawyers.bh/app/api/saraya/v1/meeting-room-bookings/route.ts`
- Modify: `apps/lawyers.bh/lib/saraya/meeting-rooms/service.test.ts`
- Modify: `apps/lawyers.bh/lib/saraya/meeting-rooms/http.test.ts`

**Interfaces:**
- Produces `service.listBookingTargets(principal, propertyId)`.
- Extends booking input with optional `bookedForUserId`.
- Repository resolves `getBookingTarget(propertyId, userId)` and records separate `actorUserId`.

- [x] Write failing service and HTTP tests for target listing and on-behalf creation.
- [x] Run focused tests and confirm expected missing behavior.
- [x] Implement target queries, authorization, input parsing, target resolution, and actor-aware audit persistence.
- [x] Run focused tests and TypeScript validation.

### Task 2: Flutter booking target selection

**Files:**
- Modify: `apps/saraya_square_app/lib/features/meeting_rooms/domain/meeting_room.dart`
- Modify: `apps/saraya_square_app/lib/features/meeting_rooms/data/meeting_room_repository.dart`
- Modify: `apps/saraya_square_app/lib/features/meeting_rooms/presentation/meeting_rooms_screen.dart`
- Modify: `apps/saraya_square_app/lib/core/localization/app_ar.arb`
- Modify: `apps/saraya_square_app/lib/core/localization/app_en.arb`
- Modify: `apps/saraya_square_app/test/features/meeting_rooms/meeting_room_repository_test.dart`
- Modify: `apps/saraya_square_app/test/features/meeting_rooms/meeting_rooms_screen_test.dart`

**Interfaces:**
- Produces `MeetingRoomRepository.bookingTargets(propertyId)`.
- Adds `bookedForUserId` to `MeetingRoomBookingInput`.
- Produces an enabled action, safe no-active-room feedback, user dropdown, and refreshed booking cards.

- [x] Write failing repository and widget tests.
- [x] Run focused Flutter tests and confirm expected failures.
- [x] Implement models, API calls, localized target dropdown, feedback, and booking owner display.
- [x] Generate localizations and run focused tests.

### Task 3: Final verification

- [x] Run focused backend tests and TypeScript validation.
- [x] Run Flutter analysis and the full Flutter test suite.
- [x] Build and publish the local web bundle.
- [x] Verify the enabled booking action and safe inactive-room state in the browser.
