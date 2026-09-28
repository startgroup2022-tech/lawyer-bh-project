import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import {
  createMeetingRoomService,
  type MeetingRoom,
  type MeetingRoomBooking,
  type MeetingRoomRepository,
} from "./service";

const propertyId = "11111111-1111-4111-8111-111111111111";
const roomId = "22222222-2222-4222-8222-222222222222";
const tenantId = "33333333-3333-4333-8333-333333333333";
const tenantUserId = "44444444-4444-4444-8444-444444444444";
const managerUserId = "55555555-5555-4555-8555-555555555555";
const bookingId = "66666666-6666-4666-8666-666666666666";
const targetUserId = "77777777-7777-4777-8777-777777777777";

const tenant: SarayaPrincipal = {
  userId: tenantUserId,
  sessionId: "tenant-session",
  propertyIds: [propertyId],
  memberships: [{ propertyId, role: "tenant", tenantId }],
};

const manager: SarayaPrincipal = {
  userId: managerUserId,
  sessionId: "manager-session",
  propertyIds: [propertyId],
  memberships: [{ propertyId, role: "property_manager" }],
};

const room: MeetingRoom = {
  id: roomId,
  propertyId,
  code: "MR-1",
  nameAr: "قاعة الاجتماعات ١",
  nameEn: "Meeting Room 1",
  capacity: 8,
  hourlyRate: "10.000",
  openingTime: "08:00:00",
  closingTime: "22:00:00",
  minimumMinutes: 60,
  bookingIncrementMinutes: 30,
  status: "active",
};

const booking: MeetingRoomBooking = {
  id: bookingId,
  propertyId,
  roomId,
  bookedByUserId: tenantUserId,
  tenantOrganizationId: tenantId,
  status: "pending",
  startAt: "2026-10-01T10:00:00+03:00",
  endAt: "2026-10-01T11:30:00+03:00",
  attendeeCount: 4,
  purpose: "Client meeting",
  amount: "15.000",
  currency: "BHD",
};

function repository(
  overrides: Partial<MeetingRoomRepository> = {},
): MeetingRoomRepository {
  return {
    listRooms: async () => [room],
    createRoom: async (input) => ({ id: roomId, ...input }),
    updateRoom: async (_propertyId, _roomId, input) => ({ ...room, ...input }),
    getRoom: async () => room,
    findBookingByIdempotency: async () => null,
    listBookings: async () => [booking],
    listBookingTargets: async () => [],
    getBookingTarget: async () => null,
    createBooking: async (input) => ({ id: bookingId, status: "pending", ...input }),
    getBooking: async () => booking,
    transitionBooking: async (input) => ({ ...booking, status: input.status }),
    ...overrides,
  };
}

describe("Saraya meeting-room service", () => {
  it("lets property management create a normalized room and denies tenants", async () => {
    let created: Parameters<MeetingRoomRepository["createRoom"]>[0] | undefined;
    const service = createMeetingRoomService(
      repository({
        createRoom: async (input) => {
          created = input;
          return { id: roomId, ...input };
        },
      }),
    );
    const input = {
      code: " mr-1 ",
      nameAr: " قاعة الاجتماعات ١ ",
      nameEn: " Meeting Room 1 ",
      capacity: 8,
      hourlyRate: "10",
    };

    await expect(service.createRoom(tenant, propertyId, input)).rejects.toMatchObject({
      code: "MEETING_ROOM_MANAGEMENT_DENIED",
    });
    await service.createRoom(manager, propertyId, input);

    expect(created).toEqual({
      propertyId,
      code: "MR-1",
      nameAr: "قاعة الاجتماعات ١",
      nameEn: "Meeting Room 1",
      descriptionAr: null,
      descriptionEn: null,
      capacity: 8,
      hourlyRate: "10.000",
      openingTime: "08:00:00",
      closingTime: "22:00:00",
      minimumMinutes: 60,
      bookingIncrementMinutes: 30,
      status: "active",
    });
  });

  it("lets property management put a room into maintenance", async () => {
    let patch: Partial<MeetingRoom> | undefined;
    const service = createMeetingRoomService(
      repository({
        updateRoom: async (_propertyId, _roomId, input) => {
          patch = input;
          return { ...room, ...input };
        },
      }),
    );

    await expect(
      service.updateRoom(tenant, propertyId, roomId, { status: "maintenance" }),
    ).rejects.toMatchObject({ code: "MEETING_ROOM_MANAGEMENT_DENIED" });
    await service.updateRoom(manager, propertyId, roomId, { status: "maintenance" });

    expect(patch).toEqual({ status: "maintenance" });
  });

  it("scopes a tenant booking list to the authenticated user", async () => {
    let receivedScope: { propertyId: string; bookedByUserId?: string } | undefined;
    const service = createMeetingRoomService(
      repository({
        listBookings: async (scope) => {
          receivedScope = scope;
          return [booking];
        },
      }),
    );

    await service.listBookings(tenant, propertyId);

    expect(receivedScope).toEqual({ propertyId, bookedByUserId: tenantUserId });
  });

  it("lets property management list all property bookings", async () => {
    let receivedScope: { propertyId: string; bookedByUserId?: string } | undefined;
    const service = createMeetingRoomService(
      repository({
        listBookings: async (scope) => {
          receivedScope = scope;
          return [booking];
        },
      }),
    );

    await service.listBookings(manager, propertyId);

    expect(receivedScope).toEqual({ propertyId });
  });

  it("lets property management list active tenant and owner booking targets", async () => {
    const targets = [{ userId: targetUserId, role: "tenant" as const, displayNameAr: "مستأجر", displayNameEn: "Tenant", tenantOrganizationId: tenantId }];
    const service = createMeetingRoomService(repository({ listBookingTargets: async () => targets }));

    await expect(service.listBookingTargets(manager, propertyId)).resolves.toEqual(targets);
    await expect(service.listBookingTargets(tenant, propertyId)).rejects.toMatchObject({ code: "MEETING_ROOM_MANAGEMENT_DENIED" });
  });

  it("creates a tenant booking with calculated BHD amount and tenant scope", async () => {
    let created: Parameters<MeetingRoomRepository["createBooking"]>[0] | undefined;
    const service = createMeetingRoomService(
      repository({
        createBooking: async (input) => {
          created = input;
          return { id: bookingId, status: "pending", ...input };
        },
      }),
    );

    const result = await service.createBooking(tenant, propertyId, {
      roomId,
      startAt: "2026-10-01T10:00:00+03:00",
      endAt: "2026-10-01T11:30:00+03:00",
      attendeeCount: 4,
      purpose: "  Client meeting  ",
      idempotencyKey: " booking-1 ",
    });

    expect(created).toEqual({
      propertyId,
      roomId,
      bookedByUserId: tenantUserId,
      actorUserId: tenantUserId,
      tenantOrganizationId: tenantId,
      startAt: "2026-10-01T10:00:00+03:00",
      endAt: "2026-10-01T11:30:00+03:00",
      attendeeCount: 4,
      purpose: "Client meeting",
      amount: "15.000",
      currency: "BHD",
      idempotencyKey: "booking-1",
    });
    expect(result).toMatchObject({ status: "pending", amount: "15.000" });
  });

  it("lets management create a booking for a selected property user", async () => {
    let created: Parameters<MeetingRoomRepository["createBooking"]>[0] | undefined;
    const service = createMeetingRoomService(repository({
      getBookingTarget: async (_propertyId, userId) => userId === targetUserId
        ? { userId: targetUserId, role: "tenant", displayNameAr: "مستأجر", displayNameEn: "Tenant", tenantOrganizationId: tenantId }
        : null,
      createBooking: async (input) => {
        created = input;
        return { id: bookingId, status: "pending", ...input };
      },
    }));

    await service.createBooking(manager, propertyId, {
      roomId,
      bookedForUserId: targetUserId,
      startAt: "2026-10-01T10:00:00+03:00",
      endAt: "2026-10-01T11:30:00+03:00",
      attendeeCount: 4,
      purpose: "Owner meeting",
      idempotencyKey: "manager-booking-1",
    });

    expect(created).toMatchObject({
      bookedByUserId: targetUserId,
      tenantOrganizationId: tenantId,
      actorUserId: managerUserId,
    });
  });

  it("rejects an on-behalf target outside the property", async () => {
    const service = createMeetingRoomService(repository({ getBookingTarget: async () => null }));
    await expect(service.createBooking(manager, propertyId, {
      roomId,
      bookedForUserId: targetUserId,
      startAt: "2026-10-01T10:00:00+03:00",
      endAt: "2026-10-01T11:30:00+03:00",
      attendeeCount: 4,
      purpose: "Invalid target",
      idempotencyKey: "manager-booking-2",
    })).rejects.toMatchObject({ code: "BOOKING_USER_NOT_FOUND" });
  });

  it("returns the original booking for a retried idempotency key", async () => {
    let roomQueried = false;
    const service = createMeetingRoomService(
      repository({
        findBookingByIdempotency: async () => booking,
        getRoom: async () => {
          roomQueried = true;
          return room;
        },
      }),
    );

    const result = await service.createBooking(tenant, propertyId, {
      roomId,
      startAt: booking.startAt,
      endAt: booking.endAt,
      attendeeCount: 4,
      purpose: booking.purpose,
      idempotencyKey: "booking-1",
    });

    expect(result).toEqual(booking);
    expect(roomQueried).toBe(false);
  });

  it("rejects attendance above room capacity before persistence", async () => {
    let persisted = false;
    const service = createMeetingRoomService(
      repository({
        createBooking: async () => {
          persisted = true;
          return booking;
        },
      }),
    );

    await expect(
      service.createBooking(tenant, propertyId, {
        roomId,
        startAt: booking.startAt,
        endAt: booking.endAt,
        attendeeCount: 9,
        purpose: booking.purpose,
        idempotencyKey: "booking-capacity",
      }),
    ).rejects.toMatchObject({ code: "ROOM_CAPACITY_EXCEEDED" });
    expect(persisted).toBe(false);
  });

  it("rejects bookings outside operating hours or off the booking increment", async () => {
    const service = createMeetingRoomService(repository());

    await expect(
      service.createBooking(tenant, propertyId, {
        roomId,
        startAt: "2026-10-01T21:30:00+03:00",
        endAt: "2026-10-01T22:30:00+03:00",
        attendeeCount: 2,
        purpose: booking.purpose,
        idempotencyKey: "booking-hours",
      }),
    ).rejects.toMatchObject({ code: "OUTSIDE_ROOM_HOURS" });

    await expect(
      service.createBooking(tenant, propertyId, {
        roomId,
        startAt: "2026-10-01T10:10:00+03:00",
        endAt: "2026-10-01T11:10:00+03:00",
        attendeeCount: 2,
        purpose: booking.purpose,
        idempotencyKey: "booking-increment",
      }),
    ).rejects.toMatchObject({ code: "INVALID_BOOKING_INCREMENT" });
  });

  it("allows only property management to confirm a pending booking", async () => {
    const service = createMeetingRoomService(repository());

    await expect(
      service.decideBooking(tenant, propertyId, bookingId, { type: "confirm" }),
    ).rejects.toMatchObject({ code: "BOOKING_DECISION_DENIED" });

    await expect(
      service.decideBooking(manager, propertyId, bookingId, { type: "confirm" }),
    ).resolves.toMatchObject({ status: "confirmed" });
  });

  it("lets the booking owner cancel but not complete their booking", async () => {
    const service = createMeetingRoomService(repository());

    await expect(
      service.decideBooking(tenant, propertyId, bookingId, { type: "cancel" }),
    ).resolves.toMatchObject({ status: "cancelled" });

    await expect(
      service.decideBooking(tenant, propertyId, bookingId, { type: "complete" }),
    ).rejects.toMatchObject({ code: "BOOKING_DECISION_DENIED" });
  });
});
