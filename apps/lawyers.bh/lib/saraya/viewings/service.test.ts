import { describe, expect, it, vi } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import type {
  PublicAppointmentInput,
  ViewingAppointment,
  ViewingSlot,
} from "./contracts";
import {
  createViewingService,
  SlotFullError,
  type ViewingRepository,
} from "./service";

const propertyId = "11111111-1111-4111-8111-111111111111";
const unitId = "22222222-2222-4222-8222-222222222222";
const otherUnitId = "33333333-3333-4333-8333-333333333333";
const slotId = "44444444-4444-4444-8444-444444444444";
const appointmentId = "55555555-5555-4555-8555-555555555555";
const managerUserId = "66666666-6666-4666-8666-666666666666";
const now = new Date("2026-10-01T08:00:00.000Z");
const requestContext = { source: "management" as const, ip: "203.0.113.7" };
const publicRequestContext = { source: "public" as const, ip: "198.51.100.9" };

const unitSlot: ViewingSlot = {
  id: slotId,
  propertyId,
  unitId,
  startAt: "2026-10-02T09:00:00.000Z",
  endAt: "2026-10-02T09:30:00.000Z",
  capacity: 1,
  bookedCount: 0,
  status: "active",
  instructionsAr: "يرجى الحضور قبل الموعد",
  instructionsEn: "Please arrive early",
  createdByUserId: managerUserId,
};

const appointment: ViewingAppointment = {
  id: appointmentId,
  propertyId,
  unitId,
  slotId,
  reference: "SV-000001",
  visitorName: "Ahmed Ali",
  visitorPhone: "+97339000000",
  visitorEmail: "ahmed@example.com",
  locale: "ar",
  status: "confirmed",
  idempotencyKey: "visit-1",
  internalNotes: "private",
  startAt: unitSlot.startAt,
  endAt: unitSlot.endAt,
};

const validInput: PublicAppointmentInput = {
  propertyId,
  unitId,
  slotId,
  visitorName: " Ahmed Ali ",
  visitorPhone: " +973 3900 0000 ",
  visitorEmail: " Ahmed@Example.COM ",
  locale: "ar",
  idempotencyKey: " visit-1 ",
};

const manager: SarayaPrincipal = {
  userId: managerUserId,
  sessionId: "session",
  propertyIds: [propertyId],
  memberships: [{ propertyId, role: "property_manager" }],
};

const tenant: SarayaPrincipal = {
  ...manager,
  memberships: [{ propertyId, role: "tenant" }],
};

function repository(overrides: Partial<ViewingRepository> = {}): ViewingRepository {
  return {
    resolvePublicUnit: vi.fn(async () => ({ propertyId, unitId })),
    unitExists: vi.fn(async () => true),
    listPublicSlots: vi.fn(async () => [
      unitSlot,
      { ...unitSlot, id: "77777777-7777-4777-8777-777777777777", unitId: null },
    ]),
    findAppointmentByIdempotency: vi.fn(async () => null),
    claimSlotAndCreateAppointment: vi.fn(async () => appointment),
    createSlot: vi.fn(async (input) => ({
      ...unitSlot,
      id: slotId,
      ...input,
      bookedCount: 0,
    })),
    listSlots: vi.fn(async () => [unitSlot]),
    updateSlot: vi.fn(async (_propertyId, _slotId, input, _actorUserId, _context) => ({
      ...unitSlot,
      ...input,
    })),
    listAppointments: vi.fn(async () => [appointment]),
    updateAppointmentStatus: vi.fn(async (_propertyId, _appointmentId, status) => ({
      ...appointment,
      status,
    })),
    ...overrides,
  };
}

describe("Saraya viewing service", () => {
  it("allows managers to list property slots and rejects tenants", async () => {
    const repo = repository();
    const service = createViewingService(repo, () => now);

    await expect(service.listSlots(manager, propertyId)).resolves.toEqual([unitSlot]);
    expect(repo.listSlots).toHaveBeenCalledWith(propertyId);
    await expect(service.listSlots(tenant, propertyId)).rejects.toMatchObject({
      status: 403,
      code: "VIEWING_MANAGEMENT_DENIED",
    });
  });

  it("returns only public fields for active future property-wide and unit-specific slots", async () => {
    const repo = repository();
    const service = createViewingService(repo, () => now);

    const result = await service.listPublicSlots(unitId, now);

    expect(repo.listPublicSlots).toHaveBeenCalledWith(propertyId, unitId, now);
    expect(result).toEqual([
      {
        id: slotId,
        startAt: unitSlot.startAt,
        endAt: unitSlot.endAt,
        remainingCapacity: 1,
        instructionsAr: unitSlot.instructionsAr,
        instructionsEn: unitSlot.instructionsEn,
      },
      expect.objectContaining({ remainingCapacity: 1 }),
    ]);
    expect(JSON.stringify(result)).not.toContain("visitorEmail");
    expect(JSON.stringify(result)).not.toContain("internalNotes");
    expect(JSON.stringify(result)).not.toContain("createdByUserId");
  });

  it("normalizes contacts and claims capacity exactly once", async () => {
    const repo = repository();
    const service = createViewingService(repo, () => now);

    const result = await service.bookPublicAppointment(validInput, publicRequestContext);

    expect(repo.claimSlotAndCreateAppointment).toHaveBeenCalledOnce();
    expect(repo.claimSlotAndCreateAppointment).toHaveBeenCalledWith(
      {
        propertyId,
        unitId,
        slotId,
        visitorName: "Ahmed Ali",
        visitorPhone: "+97339000000",
        visitorEmail: "ahmed@example.com",
        locale: "ar",
        idempotencyKey: "visit-1",
      },
      publicRequestContext,
    );
    expect(result).toEqual({
      reference: "SV-000001",
      status: "confirmed",
      startAt: unitSlot.startAt,
      endAt: unitSlot.endAt,
    });
  });

  it("returns the original appointment for a normalized email and idempotency key", async () => {
    const repo = repository({
      findAppointmentByIdempotency: vi.fn(async () => appointment),
    });
    const service = createViewingService(repo, () => now);

    const result = await service.bookPublicAppointment(validInput);

    expect(repo.findAppointmentByIdempotency).toHaveBeenCalledWith("visit-1");
    expect(repo.claimSlotAndCreateAppointment).not.toHaveBeenCalled();
    expect(result.reference).toBe("SV-000001");
  });

  it.each([
    ["propertyId", "77777777-7777-4777-8777-777777777777"],
    ["unitId", otherUnitId],
    ["slotId", "88888888-8888-4888-8888-888888888888"],
    ["visitorName", "Different Visitor"],
    ["visitorPhone", "+97339999999"],
    ["visitorEmail", "different@example.com"],
    ["locale", "en"],
  ] as const)("rejects public idempotency reuse when normalized %s differs", async (field, value) => {
    const service = createViewingService(
      repository({ findAppointmentByIdempotency: vi.fn(async () => appointment) }),
      () => now,
    );

    await expect(service.bookPublicAppointment({
      ...validInput,
      [field]: value,
    })).rejects.toMatchObject({ status: 409, code: "IDEMPOTENCY_CONFLICT" });
  });

  it("returns a localized conflict when the slot has no capacity", async () => {
    const service = createViewingService(
      repository({
        claimSlotAndCreateAppointment: vi.fn(async () => {
          throw new SlotFullError();
        }),
      }),
      () => now,
    );

    await expect(service.bookPublicAppointment(validInput)).rejects.toMatchObject({
      status: 409,
      code: "VIEWING_SLOT_FULL",
      messageAr: "موعد الزيارة مكتمل الحجز",
      messageEn: "Viewing slot is full",
    });
  });

  it("returns the original appointment when a concurrent retry observes full capacity", async () => {
    const find = vi
      .fn<() => Promise<ViewingAppointment | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(appointment);
    const service = createViewingService(
      repository({
        findAppointmentByIdempotency: find,
        claimSlotAndCreateAppointment: vi.fn(async () => {
          throw new SlotFullError();
        }),
      }),
      () => now,
    );

    await expect(service.bookPublicAppointment(validInput)).resolves.toMatchObject({
      reference: "SV-000001",
      status: "confirmed",
    });
    expect(find).toHaveBeenCalledTimes(2);
  });

  it("validates UUIDs and future time before repository mutation", async () => {
    const claim = vi.fn(async () => appointment);
    const repo = repository({ claimSlotAndCreateAppointment: claim });
    const service = createViewingService(repo, () => now);

    await expect(
      service.bookPublicAppointment({ ...validInput, slotId: "invalid" }),
    ).rejects.toMatchObject({ status: 422, code: "INVALID_VIEWING_APPOINTMENT" });
    expect(claim).not.toHaveBeenCalled();
  });

  it("allows only property management to publish slots", async () => {
    const repo = repository();
    const service = createViewingService(repo, () => now);
    const input = {
      unitId: null,
      startAt: "2026-10-02T09:00:00.000Z",
      endAt: "2026-10-02T09:30:00.000Z",
      capacity: 2,
      instructionsAr: null,
      instructionsEn: null,
      idempotencyKey: "create-slot-1",
    };

    await expect(service.createSlot(tenant, propertyId, input)).rejects.toMatchObject({
      status: 403,
    });
    await expect(service.createSlot(manager, propertyId, input, requestContext)).resolves.toMatchObject({
      status: "active",
    });
    expect(repo.createSlot).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "create-slot-1" }),
      requestContext,
    );
  });

  it("returns the repository's historical result for an administrative create retry", async () => {
    const create = vi.fn(async () => unitSlot);
    const repo = repository({ createSlot: create });
    const service = createViewingService(repo, () => now);

    await expect(
      service.createSlot(manager, propertyId, {
        unitId,
        startAt: unitSlot.startAt,
        endAt: unitSlot.endAt,
        capacity: 1,
        instructionsAr: unitSlot.instructionsAr,
        instructionsEn: unitSlot.instructionsEn,
        idempotencyKey: "create-slot-retry",
      }, requestContext),
    ).resolves.toMatchObject({ id: slotId });
    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "create-slot-retry" }),
      requestContext,
    );
  });

  it("maps a concurrent administrative create payload conflict to 409", async () => {
    const conflict = Object.assign(new Error("conflict"), {
      code: "IDEMPOTENCY_CONFLICT",
    });
    const service = createViewingService(repository({
      createSlot: vi.fn(async () => { throw conflict; }),
    }), () => now);

    await expect(service.createSlot(manager, propertyId, {
      unitId,
      startAt: unitSlot.startAt,
      endAt: unitSlot.endAt,
      capacity: 1,
      idempotencyKey: "create-race-conflict",
    }, requestContext)).rejects.toMatchObject({
      status: 409,
      code: "IDEMPOTENCY_CONFLICT",
    });
  });

  it("passes the management actor when updating a slot", async () => {
    const repo = repository();
    const service = createViewingService(repo, () => now);

    await service.updateSlot(
      manager,
      propertyId,
      slotId,
      { status: "disabled", idempotencyKey: "disable-slot-1" },
      requestContext,
    );

    expect(repo.updateSlot).toHaveBeenCalledWith(
      propertyId,
      slotId,
      { status: "disabled", idempotencyKey: "disable-slot-1" },
      managerUserId,
      requestContext,
    );
  });

  it("maps capacity and time update conflicts to stable localized API errors", async () => {
    const capacityError = Object.assign(new Error("capacity"), {
      code: "VIEWING_CAPACITY_BELOW_BOOKED",
    });
    const timeError = Object.assign(new Error("time"), {
      code: "VIEWING_SLOT_TIME_CONFLICT",
    });
    const capacityService = createViewingService(repository({
      updateSlot: vi.fn(async () => { throw capacityError; }),
    }), () => now);
    const timeService = createViewingService(repository({
      updateSlot: vi.fn(async () => { throw timeError; }),
    }), () => now);

    await expect(capacityService.updateSlot(
      manager,
      propertyId,
      slotId,
      { capacity: 0 + 1, idempotencyKey: "capacity-1" },
      requestContext,
    )).rejects.toMatchObject({ status: 409, code: "VIEWING_CAPACITY_BELOW_BOOKED" });
    await expect(timeService.updateSlot(
      manager,
      propertyId,
      slotId,
      { startAt: "2026-10-02T10:00:00.000Z", idempotencyKey: "time-1" },
      requestContext,
    )).rejects.toMatchObject({ status: 422, code: "VIEWING_SLOT_TIME_CONFLICT" });
  });

  it("passes an idempotent appointment status command and audit context", async () => {
    const repo = repository();
    const service = createViewingService(repo, () => now);

    await service.updateAppointmentStatus(
      manager,
      propertyId,
      appointmentId,
      "cancelled",
      "cancel-appointment-1",
      requestContext,
    );

    expect(repo.updateAppointmentStatus).toHaveBeenCalledWith(
      propertyId,
      appointmentId,
      "cancelled",
      managerUserId,
      "cancel-appointment-1",
      requestContext,
    );
  });

  it("does not accept a unit-specific slot from another property scope", async () => {
    const repo = repository({
      unitExists: vi.fn(async () => false),
    });
    const service = createViewingService(repo, () => now);

    await expect(
      service.createSlot(manager, propertyId, {
        unitId: otherUnitId,
        startAt: "2026-10-02T09:00:00.000Z",
        endAt: "2026-10-02T09:30:00.000Z",
        capacity: 1,
        idempotencyKey: "cross-property-1",
      }),
    ).rejects.toMatchObject({ status: 404, code: "VIEWING_UNIT_NOT_FOUND" });
    expect(repo.createSlot).not.toHaveBeenCalled();
  });
});
