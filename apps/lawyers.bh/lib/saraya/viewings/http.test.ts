import { describe, expect, it, vi } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createViewingHandlers } from "./http";

const base = "https://sq.lawyers.bh/api/saraya/v1";
const propertyId = "11111111-1111-4111-8111-111111111111";
const unitId = "22222222-2222-4222-8222-222222222222";
const slotId = "33333333-3333-4333-8333-333333333333";
const appointmentId = "44444444-4444-4444-8444-444444444444";
const principal: SarayaPrincipal = {
  userId: "55555555-5555-4555-8555-555555555555",
  sessionId: "session",
  propertyIds: [propertyId],
  memberships: [{ propertyId, role: "property_manager" }],
};

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    authenticate: vi.fn(async () => principal),
    listPublicSlots: vi.fn(async () => []),
    bookPublicAppointment: vi.fn(async () => ({
      reference: "SV-000001",
      status: "confirmed" as const,
      startAt: "2026-10-02T09:00:00.000Z",
      endAt: "2026-10-02T09:30:00.000Z",
    })),
    createSlot: vi.fn(async () => ({ id: slotId, status: "active" })),
    listSlots: vi.fn(async () => []),
    updateSlot: vi.fn(async () => ({ id: slotId, status: "disabled" })),
    listAppointments: vi.fn(async () => []),
    updateAppointmentStatus: vi.fn(async () => ({
      id: appointmentId,
      status: "cancelled",
    })),
    ...overrides,
  };
}

describe("Saraya viewing HTTP handlers", () => {
  it("allows anonymous slot listing without authentication or private fields", async () => {
    const deps = dependencies({
      listPublicSlots: vi.fn(async () => [
        {
          id: slotId,
          startAt: "2026-10-02T09:00:00.000Z",
          endAt: "2026-10-02T09:30:00.000Z",
          remainingCapacity: 1,
          instructionsAr: null,
          instructionsEn: null,
        },
      ]),
    });
    const handlers = createViewingHandlers(deps);

    const response = await handlers.listPublic(
      new Request(`${base}/public/units/${unitId}/viewing-slots`),
      { params: Promise.resolve({ unitId }) },
    );

    expect(response.status).toBe(200);
    expect(deps.authenticate).not.toHaveBeenCalled();
    expect(deps.listPublicSlots).toHaveBeenCalledWith(unitId, expect.any(Date));
    const json = await response.json();
    expect(json).toEqual({ items: [expect.objectContaining({ id: slotId })] });
    expect(JSON.stringify(json)).not.toContain("visitorEmail");
    expect(JSON.stringify(json)).not.toContain("internalNotes");
  });

  it("books anonymously and returns only the public confirmation", async () => {
    const deps = dependencies();
    const handlers = createViewingHandlers(deps);
    const response = await handlers.bookPublic(
      new Request(`${base}/public/viewing-appointments`, {
        method: "POST",
        headers: { "x-vercel-forwarded-for": "198.51.100.9" },
        body: JSON.stringify({
          propertyId,
          unitId,
          slotId,
          visitorName: "Ahmed Ali",
          visitorPhone: "+97339000000",
          visitorEmail: "ahmed@example.com",
          locale: "ar",
          idempotencyKey: "visit-1",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(deps.authenticate).not.toHaveBeenCalled();
    expect(deps.bookPublicAppointment).toHaveBeenCalledWith(
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
      { source: "public", ip: "198.51.100.9" },
    );
    expect(await response.json()).toEqual({
      reference: "SV-000001",
      status: "confirmed",
      startAt: "2026-10-02T09:00:00.000Z",
      endAt: "2026-10-02T09:30:00.000Z",
    });
  });

  it("authenticates and scopes slot publication by propertyId", async () => {
    const deps = dependencies();
    const handlers = createViewingHandlers(deps);
    const response = await handlers.createSlot(
      new Request(`${base}/viewing-slots?propertyId=${propertyId}`, {
        method: "POST",
        body: JSON.stringify({
          unitId,
          startAt: "2026-10-02T09:00:00.000Z",
          endAt: "2026-10-02T09:30:00.000Z",
          capacity: 2,
          idempotencyKey: "create-slot-1",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(deps.createSlot).toHaveBeenCalledWith(
      principal,
      propertyId,
      {
        unitId,
        startAt: "2026-10-02T09:00:00.000Z",
        endAt: "2026-10-02T09:30:00.000Z",
        capacity: 2,
        idempotencyKey: "create-slot-1",
      },
      { source: "management", ip: "development" },
    );
  });

  it("authenticates and lists management slots by propertyId", async () => {
    const deps = dependencies({ listSlots: vi.fn(async () => [{ id: slotId, status: "active" }]) });
    const handlers = createViewingHandlers(deps);

    const response = await handlers.listSlots(
      new Request(`${base}/viewing-slots?propertyId=${propertyId}`),
    );

    expect(response.status).toBe(200);
    expect(deps.authenticate).toHaveBeenCalledOnce();
    expect(deps.listSlots).toHaveBeenCalledWith(principal, propertyId);
    expect(await response.json()).toEqual({ items: [{ id: slotId, status: "active" }] });
  });

  it("forwards only supported slot patch fields", async () => {
    const deps = dependencies();
    const handlers = createViewingHandlers(deps);
    const response = await handlers.updateSlot(
      new Request(`${base}/viewing-slots/${slotId}?propertyId=${propertyId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "disabled",
          idempotencyKey: "disable-slot-1",
          unexpected: "private",
        }),
      }),
      { params: Promise.resolve({ slotId }) },
    );

    expect(response.status).toBe(200);
    expect(deps.updateSlot).toHaveBeenCalledWith(
      principal,
      propertyId,
      slotId,
      { status: "disabled", idempotencyKey: "disable-slot-1" },
      { source: "management", ip: "development" },
    );
  });

  it("lists private appointment contacts only through authenticated management", async () => {
    const deps = dependencies({
      listAppointments: vi.fn(async () => [
        { id: appointmentId, visitorEmail: "ahmed@example.com" },
      ]),
    });
    const handlers = createViewingHandlers(deps);
    const response = await handlers.listAppointments(
      new Request(`${base}/viewing-appointments?propertyId=${propertyId}`),
    );

    expect(deps.authenticate).toHaveBeenCalledOnce();
    expect(deps.listAppointments).toHaveBeenCalledWith(principal, propertyId);
    await expect(response.json()).resolves.toEqual({
      items: [{ id: appointmentId, visitorEmail: "ahmed@example.com" }],
    });
  });

  it("accepts only completed, no_show, or cancelled appointment statuses", async () => {
    const deps = dependencies();
    const handlers = createViewingHandlers(deps);
    const invalid = await handlers.updateAppointmentStatus(
      new Request(`${base}/viewing-appointments/${appointmentId}?propertyId=${propertyId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "confirmed", idempotencyKey: "status-invalid" }),
      }),
      { params: Promise.resolve({ appointmentId }) },
    );
    expect(invalid.status).toBe(422);
    expect(deps.updateAppointmentStatus).not.toHaveBeenCalled();

    const valid = await handlers.updateAppointmentStatus(
      new Request(`${base}/viewing-appointments/${appointmentId}?propertyId=${propertyId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled", idempotencyKey: "status-cancel-1" }),
      }),
      { params: Promise.resolve({ appointmentId }) },
    );
    expect(valid.status).toBe(200);
    expect(deps.updateAppointmentStatus).toHaveBeenCalledWith(
      principal,
      propertyId,
      appointmentId,
      "cancelled",
      "status-cancel-1",
      { source: "management", ip: "development" },
    );
  });
});
