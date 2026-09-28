import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createMeetingRoomHandlers } from "./http";

const propertyId = "11111111-1111-4111-8111-111111111111";
const roomId = "22222222-2222-4222-8222-222222222222";
const bookingId = "33333333-3333-4333-8333-333333333333";
const principal: SarayaPrincipal = {
  userId: "44444444-4444-4444-8444-444444444444",
  sessionId: "session",
  propertyIds: [propertyId],
  memberships: [{ propertyId, role: "tenant", tenantId: "55555555-5555-4555-8555-555555555555" }],
};

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    authenticate: async () => principal,
    listRooms: async () => [],
    createRoom: async () => ({}),
    updateRoom: async () => ({}),
    listBookings: async () => [],
    listBookingTargets: async () => [],
    createBooking: async () => ({}),
    decideBooking: async () => ({}),
    ...overrides,
  };
}

describe("Saraya meeting-room HTTP handlers", () => {
  it("parses and forwards a room creation request", async () => {
    let captured: unknown;
    const handlers = createMeetingRoomHandlers(
      dependencies({
        createRoom: async (_principal: SarayaPrincipal, receivedPropertyId: string, input: unknown) => {
          captured = { receivedPropertyId, input };
          return { id: roomId };
        },
      }),
    );
    const response = await handlers.createRoom(
      new Request(`https://sq.lawyers.bh/api?propertyId=${propertyId}`, {
        method: "POST",
        body: JSON.stringify({
          code: "MR-1",
          nameAr: "قاعة الاجتماعات ١",
          nameEn: "Meeting Room 1",
          capacity: 8,
          hourlyRate: "10.000",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(captured).toEqual({
      receivedPropertyId: propertyId,
      input: {
        code: "MR-1",
        nameAr: "قاعة الاجتماعات ١",
        nameEn: "Meeting Room 1",
        capacity: 8,
        hourlyRate: "10.000",
      },
    });
  });

  it("parses and forwards a booking request", async () => {
    let captured: unknown;
    const handlers = createMeetingRoomHandlers(
      dependencies({
        createBooking: async (_principal: SarayaPrincipal, receivedPropertyId: string, input: unknown) => {
          captured = { receivedPropertyId, input };
          return { id: bookingId, status: "pending" };
        },
      }),
    );
    const body = {
      roomId,
      startAt: "2026-10-01T10:00:00+03:00",
      endAt: "2026-10-01T11:00:00+03:00",
      attendeeCount: 4,
      purpose: "Client meeting",
      idempotencyKey: "booking-1",
    };
    const response = await handlers.createBooking(
      new Request(`https://sq.lawyers.bh/api?propertyId=${propertyId}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(201);
    expect(captured).toEqual({ receivedPropertyId: propertyId, input: body });
  });

  it("uses authenticated property scope when listing bookings", async () => {
    let captured: unknown;
    const handlers = createMeetingRoomHandlers(
      dependencies({
        listBookings: async (receivedPrincipal: SarayaPrincipal, receivedPropertyId: string) => {
          captured = { receivedPrincipal, receivedPropertyId };
          return [{ id: bookingId }];
        },
      }),
    );
    const response = await handlers.listBookings(
      new Request(`https://sq.lawyers.bh/api?propertyId=${propertyId}`),
    );

    expect(response.status).toBe(200);
    expect(captured).toEqual({ receivedPrincipal: principal, receivedPropertyId: propertyId });
    await expect(response.json()).resolves.toEqual({ items: [{ id: bookingId }] });
  });

  it("returns booking targets when requested", async () => {
    const targets = [{ userId: "55555555-5555-4555-8555-555555555555", role: "owner" }];
    const handlers = createMeetingRoomHandlers(
      dependencies({ listBookingTargets: async () => targets }),
    );
    const response = await handlers.listBookings(
      new Request(`https://sq.lawyers.bh/api?propertyId=${propertyId}&targets=true`),
    );
    await expect(response.json()).resolves.toEqual({ items: targets });
  });

  it("forwards the selected booking user", async () => {
    let captured: unknown;
    const handlers = createMeetingRoomHandlers(
      dependencies({
        createBooking: async (_principal: SarayaPrincipal, _propertyId: string, input: unknown) => {
          captured = input;
          return { id: bookingId };
        },
      }),
    );
    const response = await handlers.createBooking(
      new Request(`https://sq.lawyers.bh/api?propertyId=${propertyId}`, {
        method: "POST",
        body: JSON.stringify({ roomId, bookedForUserId: "55555555-5555-4555-8555-555555555555", startAt: "2026-10-01T10:00:00+03:00", endAt: "2026-10-01T11:00:00+03:00", attendeeCount: 2, purpose: "Meeting", idempotencyKey: "booking-user-1" }),
      }),
    );
    expect(response.status).toBe(201);
    expect(captured).toMatchObject({ bookedForUserId: "55555555-5555-4555-8555-555555555555" });
  });

  it("passes the route booking id and decision to the service", async () => {
    let captured: unknown;
    const handlers = createMeetingRoomHandlers(
      dependencies({
        decideBooking: async (
          _principal: SarayaPrincipal,
          receivedPropertyId: string,
          receivedBookingId: string,
          decision: unknown,
        ) => {
          captured = { receivedPropertyId, receivedBookingId, decision };
          return { id: bookingId, status: "rejected" };
        },
      }),
    );
    const response = await handlers.decideBooking(
      new Request(`https://sq.lawyers.bh/api?propertyId=${propertyId}`, {
        method: "POST",
        body: JSON.stringify({ decision: "reject", reason: "Unavailable" }),
      }),
      bookingId,
    );

    expect(response.status).toBe(200);
    expect(captured).toEqual({
      receivedPropertyId: propertyId,
      receivedBookingId: bookingId,
      decision: { type: "reject", reason: "Unavailable" },
    });
  });
});
