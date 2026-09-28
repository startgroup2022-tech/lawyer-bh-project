import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  authorized: true,
  rows: [] as Array<Record<string, unknown>>,
  route: {
    etaMinutes: 5,
    distanceKm: 3.46,
    encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
  } as { etaMinutes: number; distanceKm: number; encodedPolyline: string } | null,
}));
const sqlQuery = vi.hoisted(() => vi.fn(async () => state.rows));
const computeRoute = vi.hoisted(() => vi.fn(async () => state.route));

vi.mock("@/lib/sos/lawyerAuth", () => ({
  requireAdvocateRequest: vi.fn(async () => state.authorized
    ? { ok: true, advocate: { id: "lawyer-1", countryCode: "BH" } }
    : { ok: false, status: 401 }),
}));
vi.mock("@/lib/db/client", () => ({ sqlClient: sqlQuery }));
vi.mock("@/lib/sos/google-routes", () => ({ computeDrivingRoute: computeRoute }));

import { POST } from "./route";

const assignedRow = {
  assigned_lawyer_id: "lawyer-1",
  service_status: "mobilizing",
  location: { lat: 26.21, lng: 50.57 },
  workflow_type: "emergency_dispatch",
};

function request(origin: unknown = { lat: 26.2235, lng: 50.5876 }) {
  return new Request("https://example.test/api/sos/lawyer/case/REQ-1/directions", {
    method: "POST",
    headers: { authorization: "Bearer test", "content-type": "application/json" },
    body: JSON.stringify({ origin }),
  });
}

function post(req = request()) {
  return POST(req, { params: Promise.resolve({ caseRef: "REQ-1" }) });
}

describe("lawyer directions", () => {
  beforeEach(() => {
    state.authorized = true;
    state.rows = [{ ...assignedRow }];
    state.route = { etaMinutes: 5, distanceKm: 3.46, encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@" };
    sqlQuery.mockClear();
    computeRoute.mockClear();
  });

  it("returns a driving route to the stored client location for the assigned lawyer", async () => {
    const response = await post();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      origin: { lat: 26.2235, lng: 50.5876 },
      destination: { lat: 26.21, lng: 50.57 },
      etaMinutes: 5,
      distanceKm: 3.46,
      encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
    });
  });

  it("rejects unauthenticated requests before reading a case", async () => {
    state.authorized = false;
    const response = await post();
    expect(response.status).toBe(401);
    expect(sqlQuery).not.toHaveBeenCalled();
  });

  it("does not reveal client location to another lawyer", async () => {
    state.rows = [{ ...assignedRow, assigned_lawyer_id: "lawyer-2" }];
    const response = await post();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "not_your_case" });
    expect(computeRoute).not.toHaveBeenCalled();
  });

  it.each([
    [{ lat: 91, lng: 50.5 }],
    [{ lat: 26.2, lng: null }],
    [{ lat: "26.2", lng: 50.5 }],
  ])("rejects an invalid origin", async (origin) => {
    const response = await post(request(origin));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_origin" });
    expect(computeRoute).not.toHaveBeenCalled();
  });

  it("returns not found for an absent case", async () => {
    state.rows = [];
    const response = await post();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it.each([
    [{ ...assignedRow, service_status: "pending" }, "invalid_transition"],
    [{ ...assignedRow, workflow_type: "remote_consultation" }, "invalid_transition"],
    [{ ...assignedRow, location: null }, "request_has_no_location"],
  ])("rejects an ineligible case without calling Google", async (row, error) => {
    state.rows = [row];
    const response = await post();
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error });
    expect(computeRoute).not.toHaveBeenCalled();
  });

  it("returns assigned customer coordinates without invented metrics when routes fail", async () => {
    state.route = null;
    const response = await post();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      origin: { lat: 26.2235, lng: 50.5876 },
      destination: { lat: 26.21, lng: 50.57 },
      routeAvailable: false,
    });
  });
});
