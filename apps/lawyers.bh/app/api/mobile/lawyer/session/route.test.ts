import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  session: { lawyerId: "lawyer-1", countryCode: "SA" } as
    | { lawyerId: string; countryCode: string }
    | null,
}));

const database = vi.hoisted(() => ({
  row: {
    id: "lawyer-1",
    countryCode: "SA",
    nameAr: "محامي اختبار",
    nameEn: "Test Lawyer",
    email: "lawyer@example.test",
    phone: "+966500000000",
    registrationNo: "SA-100",
    status: "approved",
    active: true,
    emergencyReady: true,
    image: null,
    rating: 4.8,
    totalRequests: 12,
    completedRequests: 9,
  } as Record<string, unknown> | undefined,
  where: vi.fn(),
}));

const drizzle = vi.hoisted(() => ({
  and: vi.fn((...conditions: unknown[]) => ({ conditions })),
  eq: vi.fn((column: unknown, value: unknown) => ({ column, value })),
  sql: vi.fn(() => "aggregate"),
}));

vi.mock("@/lib/mobile-lawyer-auth", () => ({
  getMobileLawyerSession: vi.fn(() => auth.session),
}));

vi.mock("drizzle-orm", () => drizzle);

vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn(() => {
      const query = {
        from: vi.fn(),
        where: database.where,
        limit: vi.fn(async () => (database.row ? [database.row] : [])),
      };
      query.from.mockReturnValue(query);
      database.where.mockReturnValue(query);
      return query;
    }),
  },
  schema: {
    bahrainLawyers: {
      id: "lawyer.id",
      countryCode: "lawyer.countryCode",
      fullNameAr: "lawyer.fullNameAr",
      fullNameEn: "lawyer.fullNameEn",
      email: "lawyer.email",
      phone: "lawyer.phone",
      registrationNo: "lawyer.registrationNo",
      status: "lawyer.status",
      isActive: "lawyer.isActive",
      isEmergencyReady: "lawyer.isEmergencyReady",
      profileImageUrl: "lawyer.profileImageUrl",
    },
    emergencyRequests: {
      ratingStars: "emergency.ratingStars",
      countryCode: "emergency.countryCode",
      assignedLawyerId: "emergency.assignedLawyerId",
      serviceStatus: "emergency.serviceStatus",
    },
    bookingReviews: {
      lawyerRating: "review.lawyerRating",
      countryCode: "review.countryCode",
      lawyerId: "review.lawyerId",
      status: "review.status",
    },
    bookingRequests: {
      countryCode: "booking.countryCode",
      selectedLawyerId: "booking.selectedLawyerId",
      adminStatus: "booking.adminStatus",
    },
  },
}));

import { GET } from "./route";

describe("GET /api/mobile/lawyer/session", () => {
  beforeEach(() => {
    auth.session = { lawyerId: "lawyer-1", countryCode: "SA" };
    database.row = {
      id: "lawyer-1",
      countryCode: "SA",
      nameAr: "محامي اختبار",
      nameEn: "Test Lawyer",
      email: "lawyer@example.test",
      phone: "+966500000000",
      registrationNo: "SA-100",
      status: "approved",
      active: true,
      emergencyReady: true,
      image: null,
      rating: 4.8,
      totalRequests: 12,
      completedRequests: 9,
    };
    vi.clearAllMocks();
  });

  it("rejects a request without a mobile lawyer session", async () => {
    auth.session = null;

    const response = await GET(new Request("https://lawyers.bh/api/mobile/lawyer/session"));

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ ok: false, error: "UNAUTHORIZED" });
  });

  it("scopes lookup to the authenticated lawyer and country", async () => {
    await GET(new Request("https://lawyers.bh/api/mobile/lawyer/session"));

    expect(drizzle.eq).toHaveBeenCalledWith("lawyer.id", "lawyer-1");
    expect(drizzle.eq).toHaveBeenCalledWith("lawyer.countryCode", "SA");
    expect(database.where).toHaveBeenCalledOnce();
  });

  it.each(["rejected", "suspended"])("rejects unavailable account status %s", async (status) => {
    database.row = { ...database.row, status };

    const response = await GET(new Request("https://lawyers.bh/api/mobile/lawyer/session"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "ACCOUNT_UNAVAILABLE" });
  });

  it("keeps a pending review account signed in but unavailable", async () => {
    database.row = { ...database.row, status: "pending", active: false };

    const response = await GET(new Request("https://lawyers.bh/api/mobile/lawyer/session"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      lawyer: { status: "pending_review", active: false, isAvailable: false },
    });
  });

  it("returns 404 when the authenticated record is missing", async () => {
    database.row = undefined;

    const response = await GET(new Request("https://lawyers.bh/api/mobile/lawyer/session"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "LAWYER_NOT_FOUND" });
  });

  it("returns only the safe lawyer session DTO", async () => {
    database.row = {
      ...database.row,
      passwordHash: "must-not-leak",
      ibanNumber: "must-not-leak",
    };

    const response = await GET(new Request("https://lawyers.bh/api/mobile/lawyer/session"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toEqual({
      ok: true,
      lawyer: {
        id: "lawyer-1",
        countryCode: "SA",
        nameAr: "محامي اختبار",
        nameEn: "Test Lawyer",
        email: "lawyer@example.test",
        phone: "+966500000000",
        registrationNo: "SA-100",
        status: "approved",
        active: true,
        emergencyReady: true,
        isAvailable: true,
        image: null,
        rating: 4.8,
        totalRequests: 12,
        completedRequests: 9,
      },
    });
    expect(JSON.stringify(payload)).not.toContain("passwordHash");
    expect(JSON.stringify(payload)).not.toContain("ibanNumber");
  });
});
