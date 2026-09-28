import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorCalls = vi.hoisted(() => ({
  eq: [] as Array<[unknown, unknown]>,
}));

const authState = vi.hoisted(() => ({ isReviewAccount: false, isEmergencyReady: true }));
const accessState = vi.hoisted(() => ({ enabled: true }));
vi.mock("@/lib/countries/product-access", () => ({
  requireCountryProduct: vi.fn(async () => {
    if (!accessState.enabled) throw Object.assign(new Error("COUNTRY_PRODUCT_DISABLED"), { code: "COUNTRY_PRODUCT_DISABLED" });
  }),
  mapCountryProductAccessError: vi.fn((error: { code?: string }) => error.code === "COUNTRY_PRODUCT_DISABLED"
    ? { status: 403, body: { error: "COUNTRY_PRODUCT_DISABLED" } }
    : null),
}));

vi.mock("@/lib/sos/lawyerAuth", () => ({
  requireAdvocateRequest: vi.fn(async () => ({
    ok: true,
    advocate: {
      id: "lawyer-1",
      countryCode: "BH",
      isEmergencyReady: authState.isEmergencyReady,
      locationSharingEnabled: true,
      isReviewAccount: authState.isReviewAccount,
    },
  })),
}));

const database = vi.hoisted(() => ({
  selectCount: 0,
  results: [
    [
      {
        id: "request-1",
        caseRef: "SOS-123",
        caseType: "Arrest",
        contactName: "Client One",
        location: { lat: 26.2, lng: 50.5 },
        serviceStatus: "mobilizing",
        createdAt: new Date("2026-08-20T10:00:00.000Z"),
      },
    ],
    [],
  ] as unknown[][],
  select() {
    const result = this.results[this.selectCount++] ?? [];
    const query = {
      from: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(async () => result),
    };
    query.from.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    return query;
  },
}));

vi.mock("@/lib/db/client", () => ({
  db: { select: vi.fn(() => database.select()) },
  schema: {
    emergencyRequests: {
      id: "id",
      caseRef: "caseRef",
      caseType: "caseType",
      contactName: "contactName",
      location: "location",
      baseFeeBhd: "baseFeeBhd",
      serviceStatus: "serviceStatus",
      assignedLawyerId: "assignedLawyerId",
      candidateLawyerId: "candidateLawyerId",
      customerApprovedAt: "customerApprovedAt",
      lawyerResponseDeadline: "lawyerResponseDeadline",
      countryCode: "countryCode",
      createdAt: "createdAt",
      completedTimestamp: "completedTimestamp",
      description: "description",
      paymentStatus: "paymentStatus",
      tapStatus: "tapStatus",
    },
  },
}));

vi.mock("drizzle-orm", () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({strings,values}),
  and: vi.fn((...values: unknown[]) => ({ and: values })),
  desc: vi.fn((value: unknown) => ({ desc: value })),
  eq: vi.fn((left: unknown, right: unknown) => {
    operatorCalls.eq.push([left, right]);
    return { eq: [left, right] };
  }),
  gt: vi.fn((left: unknown, right: unknown) => ({ gt: [left, right] })),
  inArray: vi.fn((left: unknown, right: unknown) => ({ inArray: [left, right] })),
  isNotNull: vi.fn((value: unknown) => ({ isNotNull: value })),
  isNull: vi.fn((value: unknown) => ({ isNull: value })),
}));

import { GET } from "./route";

describe("lawyer pickup polling", () => {
  beforeEach(() => {
    authState.isReviewAccount = false;
    authState.isEmergencyReady = true;
    database.selectCount = 0;
    operatorCalls.eq.length = 0;
    accessState.enabled = true;
  });

  it("preserves assigned and completed history but suppresses new pickups when LegalSOS is disabled", async () => {
    accessState.enabled = false;
    const response = await GET(new Request("https://lawyers.bh/api/sos/lawyer/pickups/check"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      error: "COUNTRY_PRODUCT_DISABLED",
      advocateOnline: false,
      pickups: [],
      activeCases: [{ id: "request-1" }],
    });
    expect(database.selectCount).toBe(2);
  });

  it("returns no pickups and performs no request query for a review lawyer", async () => {
    authState.isReviewAccount = true;

    const response = await GET(
      new Request("https://lawyers.bh/api/sos/lawyer/pickups/check"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      advocateOnline: false,
      pickups: [],
      activeCases: [],
    });
    expect(database.selectCount).toBe(0);
  });

  it("returns active cases assigned to the authenticated lawyer", async () => {
    const response = await GET(
      new Request("https://lawyers.bh/api/sos/lawyer/pickups/check"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      activeCases: [
        {
          caseRef: "SOS-123",
          contactName: "Client One",
          serviceStatus: "mobilizing",
        },
      ],
    });
    expect(operatorCalls.eq).toContainEqual(["assignedLawyerId", "lawyer-1"]);
    expect(operatorCalls.eq).toContainEqual(["paymentStatus", "success"]);
    expect(operatorCalls.eq).toContainEqual(["tapStatus", "CAPTURED"]);
  });

  for (const online of [false, true]) {
    it(`returns completed history when availability is ${online}`, async () => {
      authState.isEmergencyReady = online;
      database.results = [[], [{
        id: 'done-1', caseRef: 'SOS-DONE', caseType: 'consultation',
        contactName: 'Previous Client', serviceStatus: 'completed',
        workflowType: 'direct_consultation', location: null,
        description: 'Actual request note',
        createdAt: new Date('2026-09-01T10:00:00Z'),
        completedAt: new Date('2026-09-02T11:00:00Z'),
      }], []];
      const response = await GET(new Request('https://lawyers.bh/api/sos/lawyer/pickups/check'));
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        completedCases: [{ id: 'done-1', serviceStatus: 'completed', description: 'Actual request note', completedAtIso: '2026-09-02T11:00:00.000Z' }],
      });
      expect(operatorCalls.eq).toContainEqual(['serviceStatus', 'completed']);
      expect(operatorCalls.eq).toContainEqual(['assignedLawyerId', 'lawyer-1']);
      expect(operatorCalls.eq).toContainEqual(['countryCode', 'BH']);
    });
  }
});
