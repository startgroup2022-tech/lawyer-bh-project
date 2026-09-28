import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  detail: vi.fn(),
}));

vi.mock("./runtime", () => ({
  publicInventoryService: { detail: state.detail },
}));

import { GET } from "@/app/api/saraya/v1/public/units/[unitId]/route";

describe("public Saraya unit detail route", () => {
  beforeEach(() => state.detail.mockReset());

  it("returns only the privacy-safe public detail contract", async () => {
    state.detail.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      propertyId: "11111111-1111-4111-8111-111111111111",
      propertyNameAr: "سرايا سكوير",
      propertyNameEn: "Saraya Square",
      unitNumber: "101",
      unitType: "office",
      displayNameAr: "مكتب ١٠١",
      displayNameEn: "Office 101",
      descriptionAr: "مكتب متاح",
      descriptionEn: "Available office",
      imageKey: "office_101",
      floor: "1",
      marketRent: "450.000",
      areaSquareMeters: "20.000",
      availableFrom: null,
      status: "vacant",
      depositAmount: "0.000",
      feeAmount: "0.000",
      currency: "BHD",
      approvalMode: "owner_review",
    });

    const response = await GET(
      new Request("https://sq.lawyers.bh/api/saraya/v1/public/units/22222222-2222-4222-8222-222222222222"),
      { params: Promise.resolve({ unitId: "22222222-2222-4222-8222-222222222222" }) },
    );
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ currency: "BHD", approvalMode: "owner_review" });
    expect(Object.keys(body).filter((key) => /tenant|owner|email|phone|document|payment|contract/i.test(key))).toEqual([]);
  });
});
