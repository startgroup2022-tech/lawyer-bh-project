import { describe, expect, it, vi } from "vitest";
import { createPublicInventoryService, type PublicUnit } from "./service";

describe("public Saraya inventory", () => {
  it("returns a safe policy-aware public unit detail projection", async () => {
    const getDetail = vi.fn().mockResolvedValue({
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
      depositAmount: "100.000",
      feeAmount: "25.000",
      currency: "BHD",
      approvalMode: "instant",
      ownerId: "must-not-leak",
      tenantUserId: "must-not-leak",
      ownerEmail: "must-not-leak",
      paymentDemandId: "must-not-leak",
      contractId: "must-not-leak",
      documentId: "must-not-leak",
    });
    const service = createPublicInventoryService({
      listAvailable: vi.fn().mockResolvedValue([]),
      getDetail,
    } as never);

    const result = await (service as unknown as { detail(unitId: string): Promise<Record<string, unknown>> }).detail(
      "22222222-2222-4222-8222-222222222222",
    );

    expect(result).toMatchObject({
      depositAmount: "100.000",
      feeAmount: "25.000",
      currency: "BHD",
      approvalMode: "instant",
    });
    const keys = Object.keys(result);
    expect(keys).not.toEqual(expect.arrayContaining([
      "ownerId",
      "tenantUserId",
      "ownerEmail",
      "paymentDemandId",
      "contractId",
      "documentId",
    ]));
    expect(keys.filter((key) => /tenant|owner|email|phone|document|payment|contract/i.test(key))).toEqual([]);
  });

  it("combines public units with aggregate virtual-address availability only", async () => {
    const unit: PublicUnit = {
      id: "unit-101",
      propertyId: "saraya-square",
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
    };
    const listAvailable = vi.fn().mockResolvedValue([unit]);
    const countVirtualAddresses = vi.fn().mockResolvedValue({
      total: 50,
      available: 47,
      tenantOrganizationId: "must-not-leak",
      businessNameAr: "must-not-leak",
    });
    const service = createPublicInventoryService({
      listAvailable,
      getDetail: async () => null,
      countVirtualAddresses,
    });

    await expect(service.home(12)).resolves.toEqual({
      units: [unit],
      virtualAddresses: { total: 50, available: 47 },
    });
    expect(listAvailable).toHaveBeenCalledWith(12, 0);
    expect(countVirtualAddresses).toHaveBeenCalledOnce();
  });

  it("caps the public result and returns only the safe unit projection", async () => {
    const unit: PublicUnit = {
      id: "unit-120",
      propertyId: "saraya-square",
      propertyNameAr: "سرايا سكوير",
      propertyNameEn: "Saraya Square",
      unitNumber: "120",
      unitType: "shop" as const,
      displayNameAr: "محل ١",
      displayNameEn: "Shop 1",
      descriptionAr: "محل تجاري بواجهة زجاجية",
      descriptionEn: "Retail shop with a glass frontage",
      imageKey: "shop_1",
      floor: "1",
      marketRent: "450.000",
      areaSquareMeters: "20.000",
      availableFrom: null,
      status: "vacant" as const,
    };
    const listAvailable = vi.fn().mockResolvedValue([unit]);
    const service = createPublicInventoryService({ listAvailable, getDetail: async () => null });

    await expect(service.list(500)).resolves.toEqual({
      items: [unit],
      nextCursor: null,
    });
    expect(listAvailable).toHaveBeenCalledWith(51, 0);
  });

  it("returns a cursor when another public inventory page exists", async () => {
    const units = Array.from({ length: 7 }, (_, index) => ({
      id: `unit-${index + 1}`,
      propertyId: "saraya-square",
      propertyNameAr: "سرايا سكوير",
      propertyNameEn: "Saraya Square",
      unitNumber: String(index + 1),
      unitType: "office" as const,
      displayNameAr: `مكتب ${index + 1}`,
      displayNameEn: `Office ${index + 1}`,
      descriptionAr: "مكتب متاح",
      descriptionEn: "Available office",
      imageKey: "office_101",
      floor: "1",
      marketRent: "450.000",
      areaSquareMeters: "20.000",
      availableFrom: null,
      status: "vacant" as const,
    }));
    const listAvailable = vi.fn().mockResolvedValue(units);
    const service = createPublicInventoryService({ listAvailable, getDetail: async () => null });

    await expect(service.list(6, "12")).resolves.toEqual({
      items: units.slice(0, 6),
      nextCursor: "18",
    });
    expect(listAvailable).toHaveBeenCalledWith(7, 12);
  });
});
