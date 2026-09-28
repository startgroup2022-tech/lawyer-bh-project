import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  session: { lawyerId: "lawyer-1", countryCode: "BH" } as
    | { lawyerId: string; countryCode: string }
    | null,
}));
const requireCountryProduct = vi.hoisted(() => vi.fn(async () => {
  throw new Error("COUNTRY_PRODUCT_DISABLED");
}));

vi.mock("@/lib/mobile-lawyer-auth", () => ({
  getMobileLawyerSession: vi.fn(() => auth.session),
}));
vi.mock("@/lib/countries/product-access", () => ({
  requireCountryProduct,
  mapCountryProductAccessError: vi.fn(() => ({
    status: 403,
    body: { error: "COUNTRY_PRODUCT_DISABLED" },
  })),
}));

const database = vi.hoisted(() => {
  const sourceRow: Record<string, unknown> = {
    id: "lawyer-1",
    countryCode: "BH",
    fullNameAr: "محامٍ تجريبي",
    fullNameEn: "Test Lawyer",
    phone: "+97300000000",
    email: "lawyer@example.com",
    licenseNumber: "TEST-1",
    profileImageUrl: "https://blob.example/lawyer.jpg",
    status: "approved",
    isActive: true,
    isEmergencyReady: true,
    rating: 0,
    totalRequests: 0,
    completedRequests: 0,
  };

  return {
    select(selection: Record<string, unknown>) {
      const selectedRow = Object.fromEntries(
        Object.keys(selection).map((key) => [key, sourceRow[key]]),
      );
      const query = {
        from: vi.fn(),
        where: vi.fn(),
        limit: vi.fn(async () => [selectedRow]),
      };
      query.from.mockReturnValue(query);
      query.where.mockReturnValue(query);
      return query;
    },
  };
});

vi.mock("@/lib/db/client", () => ({
  db: { select: vi.fn(database.select) },
  schema: {
    bahrainLawyers: {
      id: "id",
      countryCode: "countryCode",
      fullNameAr: "fullNameAr",
      fullNameEn: "fullNameEn",
      phone: "phone",
      email: "email",
      registrationNo: "licenseNumber",
      profileImageUrl: "profileImageUrl",
      status: "status",
      isActive: "isActive",
      isEmergencyReady: "isEmergencyReady",
    },
    emergencyRequests: {},
    bookingReviews: {},
    bookingRequests: {},
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(() => true),
  eq: vi.fn(() => true),
  sql: vi.fn(() => "aggregate"),
}));

import { GET } from "./route";

describe("mobile lawyer details", () => {
  beforeEach(() => {
    auth.session = { lawyerId: "lawyer-1", countryCode: "BH" };
    requireCountryProduct.mockClear();
  });

  it("returns authenticated profile and history independently of the Lawyers Platform", async () => {
    const response = await GET(new Request("https://lawyers.bh"), {
      params: Promise.resolve({ id: "lawyer-1" }),
    });

    expect(response.status).toBe(200);
    expect(requireCountryProduct).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        id: "lawyer-1",
        profileImageUrl: "https://blob.example/lawyer.jpg",
      },
    });
  });

  it("does not expose another lawyer record", async () => {
    const response = await GET(new Request("https://lawyers.bh"), {
      params: Promise.resolve({ id: "lawyer-2" }),
    });

    expect(response.status).toBe(401);
  });
});
