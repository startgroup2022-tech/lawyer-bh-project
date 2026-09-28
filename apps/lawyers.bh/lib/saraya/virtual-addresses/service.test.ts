import { describe, expect, it } from "vitest";
import { createVirtualAddressService } from "./service";

const principal = {
  userId: "10000000-0000-4000-8000-000000000001",
  propertyIds: ["20000000-0000-4000-8000-000000000001"],
  memberships: [
    {
      propertyId: "20000000-0000-4000-8000-000000000001",
      role: "super_admin" as const,
    },
  ],
  sessionId: "30000000-0000-4000-8000-000000000001",
};

describe("virtual-address service", () => {
  it("lists the fifty property-scoped virtual addresses", async () => {
    const calls: string[] = [];
    const service = createVirtualAddressService({
      async list(propertyId) {
        calls.push(propertyId);
        return Array.from({ length: 50 }, (_, index) => ({
          id: `address-${index + 1}`,
          propertyId,
          slotNumber: index + 1,
          code: `VA-${String(index + 1).padStart(3, "0")}`,
          status: "available" as const,
          tenantOrganizationId: null,
          tenantNameAr: null,
          tenantNameEn: null,
          businessNameAr: null,
          businessNameEn: null,
          monthlyFee: null,
          startDate: null,
          endDate: null,
        }));
      },
      update: async () => { throw new Error("unused"); },
    });

    const result = await service.list(
      principal,
      "20000000-0000-4000-8000-000000000001",
    );

    expect(result).toHaveLength(50);
    expect(calls).toEqual(["20000000-0000-4000-8000-000000000001"]);
  });

  it("updates a property-scoped slot and records the actor", async () => {
    const calls: unknown[] = [];
    const service = createVirtualAddressService({
      list: async () => [],
      update: async (input) => {
        calls.push(input);
        return { id: input.id } as never;
      },
    });

    await service.update(
      principal,
      "20000000-0000-4000-8000-000000000001",
      "40000000-0000-4000-8000-000000000001",
      {
        status: "active",
        tenantOrganizationId: "50000000-0000-4000-8000-000000000001",
        businessNameAr: "شركة المثال",
        businessNameEn: "Example Company",
        monthlyFee: "35.000",
        startDate: "2026-10-01",
        endDate: "2027-09-30",
      },
    );

    expect(calls).toEqual([
      expect.objectContaining({
        propertyId: "20000000-0000-4000-8000-000000000001",
        id: "40000000-0000-4000-8000-000000000001",
        actorUserId: principal.userId,
        status: "active",
      }),
    ]);
  });

  it("rejects access outside the authenticated property", async () => {
    const service = createVirtualAddressService({
      list: async () => [],
      update: async () => { throw new Error("unused"); },
    });

    await expect(
      service.list(principal, "20000000-0000-4000-8000-000000000099"),
    ).rejects.toMatchObject({ status: 403, code: "PROPERTY_ACCESS_DENIED" });
  });
});
