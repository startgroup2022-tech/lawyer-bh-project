# Saraya Square Meeting Room Bookings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add property-scoped meeting rooms and conflict-safe booking workflows to the existing Saraya API.

**Architecture:** A dedicated meeting-room module owns validation, authorization, persistence, and HTTP handling. PostgreSQL serializes writes per room and rejects overlapping active bookings, while the service keeps tenant and management visibility separate.

**Tech Stack:** Next.js 16 Route Handlers, TypeScript, Drizzle ORM, PostgreSQL, Vitest.

## Global Constraints

- Preserve existing Lawyers and Saraya tables; use forward-only migration `0113`.
- Store money as `numeric(14,3)` and currency as BHD.
- Enforce property isolation in every foreign key and query.
- Use authenticated Saraya principals and role-based authorization.
- Write tests before production code and verify each red-green cycle.

---

### Task 1: Database contract

**Files:**
- Create: `apps/lawyers.bh/lib/saraya/meeting-rooms/migration.test.ts`
- Create: `apps/lawyers.bh/drizzle/0114_saraya_meeting_room_bookings.sql`
- Create: `apps/lawyers.bh/drizzle/verify_0114_saraya_meeting_room_bookings.sql`
- Modify: `apps/lawyers.bh/drizzle/meta/_journal.json`
- Modify: `apps/lawyers.bh/lib/db/saraya-schema.ts`

**Interfaces:**
- Produces: `sarayaMeetingRooms` and `sarayaMeetingRoomBookings` Drizzle tables plus database overlap enforcement.

- [ ] Write a failing migration contract test for property-scoped references, fixed-precision BHD, active-booking indexes, overlap trigger, and journal position after `0112`.
- [ ] Run the focused test and confirm failure because migration `0113` does not exist.
- [ ] Add the migration, verification SQL, journal entry, and matching Drizzle metadata.
- [ ] Run the focused test and confirm it passes.

### Task 2: Booking domain service

**Files:**
- Create: `apps/lawyers.bh/lib/saraya/meeting-rooms/contracts.ts`
- Create: `apps/lawyers.bh/lib/saraya/meeting-rooms/service.test.ts`
- Create: `apps/lawyers.bh/lib/saraya/meeting-rooms/service.ts`

**Interfaces:**
- Consumes: authenticated `SarayaPrincipal` and repository methods defined by `MeetingRoomRepository`.
- Produces: `createMeetingRoomService(repository, clock)` with `listRooms`, `createRoom`, `updateRoom`, `listBookings`, `createBooking`, and `decideBooking`.

- [ ] Write failing tests for role-scoped lists, tenant self-booking, time/capacity validation, idempotency, conflicts, and management-only decisions.
- [ ] Run the focused service test and confirm failures because the service does not exist.
- [ ] Implement the minimal contracts and service behavior.
- [ ] Run the focused test and confirm it passes.

### Task 3: Persistence and HTTP routes

**Files:**
- Create: `apps/lawyers.bh/lib/saraya/meeting-rooms/repository.ts`
- Create: `apps/lawyers.bh/lib/saraya/meeting-rooms/http.test.ts`
- Create: `apps/lawyers.bh/lib/saraya/meeting-rooms/http.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/meeting-rooms/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/meeting-rooms/[id]/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/meeting-room-bookings/route.ts`
- Create: `apps/lawyers.bh/app/api/saraya/v1/meeting-room-bookings/[id]/decision/route.ts`
- Modify: `apps/lawyers.bh/lib/saraya/auth/contracts.ts`
- Modify: `apps/lawyers.bh/lib/saraya/access/authorize.ts`

**Interfaces:**
- Consumes: meeting-room service and existing Saraya session verification/error handling.
- Produces: authenticated JSON route handlers under `/api/saraya/v1`.

- [ ] Write failing HTTP tests for parsed room creation, booking creation, list filters, and decisions.
- [ ] Run the focused HTTP test and confirm failure because handlers do not exist.
- [ ] Implement repository queries, audit inserts, permission mapping, handlers, and routes.
- [ ] Run focused HTTP and service tests and confirm they pass.

### Task 4: Verification

**Files:**
- Verify all files from Tasks 1-3.

**Interfaces:**
- Produces: a tested backend slice ready for database migration and client integration.

- [ ] Run all Saraya-focused Vitest files.
- [ ] Run TypeScript without emitting files.
- [ ] Inspect the diff for unrelated changes and confirm the original worktree remains untouched.
