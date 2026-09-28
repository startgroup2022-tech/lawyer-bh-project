import { beforeEach, describe, expect, it, vi } from "vitest";

const dispatchStore = vi.hoisted(() => ({
  findPaidMobileBooking: vi.fn(),
  getOrSelectCandidate: vi.fn(),
}));
const googleRoutes = vi.hoisted(() => ({
  computeDrivingRoute: vi.fn(),
}));
const push = vi.hoisted(() => ({
  sendLawyerPush: vi.fn(async () => ({ sent: 1, failed: 0, pruned: 0 })),
  sendClientPush: vi.fn(async () => ({ sent: 1, failed: 0, pruned: 0 })),
}));

vi.mock("@/lib/sos/mobile-dispatch-auth", () => ({
  bearerToken: vi.fn(() => "token"),
  authorizeMobileDispatchToken: vi.fn(async () => true),
}));

vi.mock("@/lib/sos/live-dispatch-store", () => dispatchStore);
vi.mock("@/lib/sos/google-routes", () => googleRoutes);
vi.mock("@/lib/sos/mobile-push", () => ({
  mobilePushSender: vi.fn(async () => push),
}));

import { POST } from "./route";

const requestId = "8d983269-123f-49a8-9b62-ccaa7a4e496e";

function candidateRequest() {
  return new Request(
    `https://www.lawyers.bh/api/mobile/sos/requests/${requestId}/candidate`,
    {
      method: "POST",
      headers: {
        authorization: "Bearer token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ latitude: 26.2235, longitude: 50.5876 }),
    },
  );
}

describe("mobile SOS candidate selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not require or expose location for direct consultation", async () => {
    dispatchStore.findPaidMobileBooking.mockResolvedValue({
      id: requestId,
      workflowType: "direct_consultation",
      locale: "ar",
    });
    dispatchStore.getOrSelectCandidate.mockResolvedValue({
      requestId,
      candidate: { id: "8d983269-123f-49a8-9b62-ccaa7a4e496f", name: "المحامي حبيب", profileImageUrl: null, rating: 4.7, specialty: "criminal", distanceKm: 0, priceBhd: 15 },
      candidateLocation: null,
    });
    const response = await POST(new Request(`https://www.lawyers.bh/api/mobile/sos/requests/${requestId}/candidate`, {
      method: "POST", headers: { authorization: "Bearer token", "content-type": "application/json" }, body: JSON.stringify({ directConsultation: true }),
    }), { params: Promise.resolve({ requestId }) });
    expect(response.status).toBe(200);
    expect(dispatchStore.getOrSelectCandidate).toHaveBeenCalledWith({ booking: expect.objectContaining({ workflowType: "direct_consultation" }), customerLocation: undefined });
    expect(googleRoutes.computeDrivingRoute).not.toHaveBeenCalled();
  });

  it("returns route-backed ETA and distance without lawyer coordinates", async () => {
    dispatchStore.findPaidMobileBooking.mockResolvedValue({ id: requestId });
    dispatchStore.getOrSelectCandidate.mockResolvedValue({
      requestId,
      candidate: {
        id: "8d983269-123f-49a8-9b62-ccaa7a4e496f",
        name: "المحامي حبيب",
        profileImageUrl: null,
        rating: 4.7,
        specialty: "criminal",
        distanceKm: 1.2,
        priceBhd: 150,
      },
      candidateLocation: { lat: 26.24, lng: 50.59 },
    });
    googleRoutes.computeDrivingRoute.mockResolvedValue({
      etaMinutes: 9,
      distanceKm: 5.4,
    });

    const response = await POST(candidateRequest(), {
      params: Promise.resolve({ requestId }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      requestId,
      candidate: {
        id: "8d983269-123f-49a8-9b62-ccaa7a4e496f",
        name: "المحامي حبيب",
        profileImageUrl: null,
        rating: 4.7,
        specialty: "criminal",
        etaMinutes: 9,
        distanceKm: 5.4,
        priceBhd: 150,
      },
    });
    expect(googleRoutes.computeDrivingRoute).toHaveBeenCalledWith({
      origin: { lat: 26.24, lng: 50.59 },
      destination: { lat: 26.2235, lng: 50.5876 },
    });
    expect(JSON.stringify(body)).not.toContain("26.24");
    expect(JSON.stringify(body)).not.toContain("50.59");
    expect(push.sendLawyerPush).not.toHaveBeenCalled();
    expect(push.sendClientPush).toHaveBeenCalledWith({
      eventType: "lawyer_found",
      requestId,
      locale: "ar",
    });
  });

  it("returns distance and estimated travel time when route lookup is unavailable", async () => {
    dispatchStore.findPaidMobileBooking.mockResolvedValue({ id: requestId });
    dispatchStore.getOrSelectCandidate.mockResolvedValue({
      requestId,
      candidate: {
        id: "8d983269-123f-49a8-9b62-ccaa7a4e496f",
        name: "Lawyer One",
        profileImageUrl: null,
        rating: 4.7,
        specialty: "criminal",
        distanceKm: 1.2,
        priceBhd: 150,
      },
      candidateLocation: { lat: 26.24, lng: 50.59 },
    });
    googleRoutes.computeDrivingRoute.mockResolvedValue(null);

    const response = await POST(candidateRequest(), {
      params: Promise.resolve({ requestId }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.candidate).toEqual(expect.objectContaining({
      etaMinutes: 3,
      distanceKm: 1.2,
    }));
  });

  it("logs a sanitized database failure and returns a stable 500 response", async () => {
    const databaseError = Object.assign(new Error('column "tap_status" does not exist'), {
      name: "PostgresError",
      code: "42703",
      severity: "ERROR",
      position: "314",
      file: "parse_relation.c",
      routine: "errorMissingColumn",
      connectionString: "postgres://secret@example.invalid/database",
    });
    dispatchStore.findPaidMobileBooking.mockRejectedValue(databaseError);
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(
      new Request(`https://www.lawyers.bh/api/mobile/sos/requests/${requestId}/candidate`, {
        method: "POST",
        headers: { authorization: "Bearer token", "content-type": "application/json" },
        body: JSON.stringify({ latitude: 26.2235, longitude: 50.5876 }),
      }),
      { params: Promise.resolve({ requestId }) },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "dispatch_failed" });
    expect(errorLog).toHaveBeenCalledWith("[mobile/sos/candidate] failed", {
      requestId,
      stage: "find_paid_booking",
      name: "PostgresError",
      message: 'column "tap_status" does not exist',
      code: "42703",
      severity: "ERROR",
      position: "314",
      file: "parse_relation.c",
      routine: "errorMissingColumn",
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("postgres://secret");
  });

  it("identifies candidate ranking failures separately from paid booking lookup", async () => {
    dispatchStore.findPaidMobileBooking.mockResolvedValue({ id: requestId });
    dispatchStore.getOrSelectCandidate.mockRejectedValue(
      new TypeError('The "string" argument received an Array'),
    );
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await POST(
      new Request(`https://www.lawyers.bh/api/mobile/sos/requests/${requestId}/candidate`, {
        method: "POST",
        headers: { authorization: "Bearer token", "content-type": "application/json" },
        body: JSON.stringify({ latitude: 26.2235, longitude: 50.5876 }),
      }),
      { params: Promise.resolve({ requestId }) },
    );

    expect(errorLog).toHaveBeenCalledWith("[mobile/sos/candidate] failed", expect.objectContaining({
      requestId,
      stage: "select_candidate",
    }));
    expect(push.sendLawyerPush).not.toHaveBeenCalled();
    expect(push.sendClientPush).not.toHaveBeenCalled();
  });

  it("returns a conflict instead of a server failure when the request is already assigned", async () => {
    dispatchStore.findPaidMobileBooking.mockResolvedValue({ id: requestId });
    dispatchStore.getOrSelectCandidate.mockRejectedValue(
      new Error("dispatch_already_assigned"),
    );
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(candidateRequest(), {
      params: Promise.resolve({ requestId }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "dispatch_already_assigned",
    });
    expect(errorLog).not.toHaveBeenCalled();
  });
});
