import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  updates: [] as Array<{ table: unknown; values: Record<string, unknown> }>,
  assignedCases: [] as Array<{ id: string }>,
}));
const access = vi.hoisted(() => ({ enabled: true }));
const conditions = vi.hoisted(() => ({ eq: [] as Array<[unknown, unknown]> }));
vi.mock("@/lib/countries/product-access", () => ({
  requireCountryProduct: vi.fn(async () => {
    if (!access.enabled) throw Object.assign(new Error("COUNTRY_PRODUCT_DISABLED"), { code: "COUNTRY_PRODUCT_DISABLED" });
  }),
  mapCountryProductAccessError: vi.fn((error: { code?: string }) => error.code === "COUNTRY_PRODUCT_DISABLED"
    ? { status: 403, body: { error: "COUNTRY_PRODUCT_DISABLED" } }
    : null),
}));

vi.mock("@/lib/mobile-lawyer-auth", () => ({
  getMobileLawyerSession: vi.fn(() => ({
    lawyerId: "lawyer-1",
    countryCode: "BH",
  })),
}));
vi.mock("@/lib/sos/lawyerAuth", () => ({
  requireAdvocate: vi.fn(async () => ({ ok: false })),
}));
vi.mock("@/lib/db/client", () => ({
  schema: {
    bahrainLawyers: {
      id: "lawyer.id",
      countryCode: "lawyer.countryCode",
      isEmergencyReady: "lawyer.isEmergencyReady",
      locationSharingEnabled: "lawyer.locationSharingEnabled",
      liveLocation: "lawyer.liveLocation",
      liveLocationUpdatedAt: "lawyer.liveLocationUpdatedAt",
    },
    emergencyRequests: {
      id: "request.id",
      assignedLawyerId: "request.assignedLawyerId",
      countryCode: "request.countryCode",
      serviceStatus: "request.serviceStatus",
      lastAdvocateLocation: "request.lastAdvocateLocation",
      updatedAt: "request.updatedAt",
    },
  },
  db: {
    select: vi.fn(() => {
      const query = {
        from: vi.fn(),
        where: vi.fn(),
        limit: vi.fn(async () => database.assignedCases),
      };
      query.from.mockReturnValue(query);
      query.where.mockReturnValue(query);
      return query;
    }),
    update: vi.fn((table: unknown) => {
      const entry = { table, values: {} as Record<string, unknown> };
      database.updates.push(entry);
      const query = {
        set: vi.fn((values: Record<string, unknown>) => {
          entry.values = values;
          return query;
        }),
        where: vi.fn(() => query),
        returning: vi.fn(async () => [{ id: "lawyer-1" }]),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(undefined).then(resolve),
      };
      return query;
    }),
  },
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn((...values: unknown[]) => ({ and: values })),
  eq: vi.fn((left: unknown, right: unknown) => {
    conditions.eq.push([left, right]);
    return { eq: [left, right] };
  }),
}));

import { POST } from "./route";
import { getMobileLawyerSession } from '@/lib/mobile-lawyer-auth';
import { requireAdvocate } from '@/lib/sos/lawyerAuth';

describe("lawyer live location", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.updates.length = 0;
    database.assignedCases = [];
    access.enabled = true;
    conditions.eq.length = 0;
  });

  it("allows location updates for an existing assigned mobilizing case when LegalSOS is disabled", async () => {
    access.enabled = false;
    database.assignedCases = [{ id: "request-1" }];
    const response = await POST(new Request("https://lawyers.bh/api/sos/lawyer/live-location", {
      method: "POST",
      headers: { authorization: "Bearer lawyer-token", "content-type": "application/json" },
      body: JSON.stringify({ latitude: 26.21, longitude: 50.57, accuracy: 7, reportedAt: new Date().toISOString() }),
    }));
    expect(response.status).toBe(200);
    expect(database.updates).toHaveLength(2);
    expect(conditions.eq).toContainEqual(["request.assignedLawyerId", "lawyer-1"]);
    expect(conditions.eq).toContainEqual(["request.countryCode", "BH"]);
    expect(conditions.eq).toContainEqual(["request.serviceStatus", "mobilizing"]);
  });

  it("blocks disabled LegalSOS location writes without an assigned mobilizing case", async () => {
    access.enabled = false;
    const response = await POST(new Request("https://lawyers.bh/api/sos/lawyer/live-location", {
      method: "POST",
      headers: { authorization: "Bearer lawyer-token", "content-type": "application/json" },
      body: JSON.stringify({ latitude: 26.21, longitude: 50.57, accuracy: 7, reportedAt: new Date().toISOString() }),
    }));
    expect(response.status).toBe(403);
    expect(database.updates).toHaveLength(0);
  });

  it("copies an authenticated GPS report to assigned mobilizing requests", async () => {
    const reportedAt = new Date().toISOString();
    const response = await POST(new Request(
      "https://www.lawyers.bh/api/sos/lawyer/live-location",
      {
        method: "POST",
        headers: {
          authorization: "Bearer lawyer-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          latitude: 26.21,
          longitude: 50.57,
          accuracy: 7,
          reportedAt,
        }),
      },
    ));

    expect(response.status).toBe(200);
    expect(database.updates).toHaveLength(2);
    expect(database.updates[1]).toMatchObject({
      table: expect.objectContaining({
        lastAdvocateLocation: "request.lastAdvocateLocation",
      }),
      values: {
        lastAdvocateLocation: {
          lat: 26.21,
          lng: 50.57,
          accuracy: 7,
          reportedAt,
        },
        updatedAt: expect.any(Date),
      },
    });
  });

  it('does not rescue a rejected app token using a website cookie', async () => {
    vi.mocked(getMobileLawyerSession).mockResolvedValueOnce(null);
    vi.mocked(requireAdvocate).mockResolvedValueOnce({ ok: true, advocate: { id: 'lawyer-1', countryCode: 'BH' } } as never);
    const response = await POST(new Request('https://lawyers.bh/api/sos/lawyer/live-location', {
      method: 'POST',
      headers: { authorization: 'Bearer closed-account-token', 'content-type': 'application/json' },
      body: JSON.stringify({ latitude: 26.21, longitude: 50.57, accuracy: 7, reportedAt: new Date().toISOString() }),
    }));
    expect(response.status).toBe(401);
    expect(database.updates).toHaveLength(0);
  });
});
