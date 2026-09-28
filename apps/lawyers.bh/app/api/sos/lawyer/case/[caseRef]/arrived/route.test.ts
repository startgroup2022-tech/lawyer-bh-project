import { beforeEach, describe, expect, it, vi } from "vitest";

const sendClientPush = vi.hoisted(() => vi.fn(async () => ({ sent: 1, failed: 0, pruned: 0 })));
const row = vi.hoisted(() => ({
  value: {
    id: "00000000-0000-4000-8000-000000000001",
    serviceStatus: "mobilizing",
    assignedLawyerId: "lawyer-1",
    location: { lat: 26.2, lng: 50.58 },
    locale: "ar",
  },
}));

vi.mock("@/lib/sos/lawyerAuth", () => ({
  requireAdvocateRequest: vi.fn(async () => ({
    ok: true,
    advocate: { id: "lawyer-1", countryCode: "BH" },
  })),
}));
vi.mock("@/lib/sos/geo", () => ({ haversineKm: vi.fn(() => 0.05) }));
vi.mock("@/lib/sos/mobile-push", () => ({
  mobilePushSender: vi.fn(async () => ({ sendClientPush })),
}));
vi.mock("@/lib/db/client", () => {
  const selectQuery = { from: vi.fn(), where: vi.fn(), limit: vi.fn(async () => [row.value]) };
  selectQuery.from.mockReturnValue(selectQuery);
  selectQuery.where.mockReturnValue(selectQuery);
  const updateQuery = { set: vi.fn(), where: vi.fn(), returning: vi.fn() };
  updateQuery.set.mockReturnValue(updateQuery);
  updateQuery.where.mockReturnValue(updateQuery);
  updateQuery.returning.mockResolvedValue([{ id: row.value.id }]);
  return {
    db: { select: vi.fn(() => selectQuery), update: vi.fn(() => updateQuery) },
    schema: {
      emergencyRequests: {
        id: "id", caseRef: "caseRef", countryCode: "countryCode",
        serviceStatus: "serviceStatus", assignedLawyerId: "assignedLawyerId",
        location: "location", locale: "locale", arrivalTimestamp: "arrivalTimestamp",
        updatedAt: "updatedAt",
      },
    },
  };
});

import { POST } from "./route";

describe("lawyer arrival notifications", () => {
  beforeEach(() => {
    sendClientPush.mockClear();
    row.value = {
      id: "00000000-0000-4000-8000-000000000001",
      serviceStatus: "mobilizing",
      assignedLawyerId: "lawyer-1",
      location: { lat: 26.2, lng: 50.58 },
      locale: "ar",
    };
  });

  it("notifies the client after arrival is committed", async () => {
    const response = await POST(
      new Request("https://lawyers.bh", {
        method: "POST",
        body: JSON.stringify({ location: { lat: 26.2, lng: 50.58 } }),
      }),
      { params: Promise.resolve({ caseRef: "SOS-1" }) },
    );

    expect(response.status).toBe(200);
    expect(sendClientPush).toHaveBeenCalledOnce();
    expect(sendClientPush).toHaveBeenCalledWith({
      eventType: "lawyer_arrived",
      requestId: row.value.id,
      locale: "ar",
    });
  });

  it("does not notify on an invalid repeated arrival", async () => {
    row.value = { ...row.value, serviceStatus: "arrived" };

    const response = await POST(
      new Request("https://lawyers.bh", {
        method: "POST",
        body: JSON.stringify({ location: { lat: 26.2, lng: 50.58 } }),
      }),
      { params: Promise.resolve({ caseRef: "SOS-1" }) },
    );

    expect(response.status).toBe(409);
    expect(sendClientPush).not.toHaveBeenCalled();
  });
});
