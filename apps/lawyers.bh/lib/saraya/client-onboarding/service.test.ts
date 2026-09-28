import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import {
  createClientOnboardingService,
  type ClientOnboardingRepository,
} from "./service";

const propertyId = "11111111-1111-4111-8111-111111111111";
const otherPropertyId = "22222222-2222-4222-8222-222222222222";
const unitId = "33333333-3333-4333-8333-333333333333";
const addressId = "44444444-4444-4444-8444-444444444444";
const actorUserId = "55555555-5555-4555-8555-555555555555";

const manager: SarayaPrincipal = {
  userId: actorUserId,
  sessionId: "session",
  propertyIds: [propertyId, otherPropertyId],
  memberships: [
    { propertyId, role: "property_manager" },
    { propertyId: otherPropertyId, role: "super_admin" },
  ],
};

const property = {
  id: propertyId,
  code: "SQ",
  nameAr: "سرايا سكوير",
  nameEn: "Saraya Square",
  currencyCode: "BHD",
};

const unit = {
  id: unitId,
  propertyId,
  unitNumber: "101",
  displayNameAr: "مكتب 101",
  displayNameEn: "Office 101",
  marketRent: "500.000",
};

const address = {
  id: addressId,
  propertyId,
  code: "VA-001",
  slotNumber: 1,
  monthlyFee: "35.000",
};

function repository(
  overrides: Partial<ClientOnboardingRepository> = {},
): ClientOnboardingRepository {
  return {
    listProperties: async () => [property, { ...property, id: otherPropertyId, code: "P2" }],
    listAvailableUnits: async () => [unit],
    listAvailableVirtualAddresses: async () => [address],
    createTenantOnboarding: async (input) => ({
      tenantId: "66666666-6666-4666-8666-666666666666",
      leaseIds: input.units.map((_, index) => `lease-${index + 1}`),
      virtualAddressIds: input.virtualAddresses.map((item) => item.virtualAddressId),
    }),
    createOwnerOnboarding: async (input) => ({
      ownerIds: input.propertyIds.map((id) => `owner-${id}`),
    }),
    ...overrides,
  };
}

const tenantInput = {
  propertyId,
  nameAr: "شركة ألف",
  nameEn: "Alpha Company",
  registrationNumber: "CR-1",
  taxNumber: "VAT-1",
  units: [
    {
      unitId,
      startDate: "2026-10-01",
      endDate: "2027-09-30",
      rentAmount: "500.000",
      depositAmount: "500.000",
      frequency: "monthly" as const,
      dueDay: 1,
      graceDays: 5,
    },
  ],
  virtualAddresses: [
    {
      virtualAddressId: addressId,
      businessNameAr: "شركة ألف",
      businessNameEn: "Alpha Company",
      monthlyFee: "35.000",
      startDate: "2026-10-01",
      endDate: "2027-09-30",
    },
  ],
};

describe("client onboarding service", () => {
  it("lists only authorized properties and property-scoped available assets", async () => {
    const calls: string[] = [];
    const service = createClientOnboardingService(
      repository({
        listProperties: async (ids) => {
          expect(ids).toEqual([propertyId, otherPropertyId]);
          return [property];
        },
        listAvailableUnits: async (id) => {
          calls.push(`units:${id}`);
          return [unit];
        },
        listAvailableVirtualAddresses: async (id) => {
          calls.push(`addresses:${id}`);
          return [address];
        },
      }),
    );

    await expect(service.options(manager)).resolves.toEqual({ properties: [property] });
    await expect(service.options(manager, propertyId)).resolves.toEqual({
      properties: [property],
      units: [unit],
      virtualAddresses: [address],
    });
    expect(calls).toEqual([`units:${propertyId}`, `addresses:${propertyId}`]);
  });

  it("creates mixed tenant assets with the authenticated actor", async () => {
    let received: unknown;
    const service = createClientOnboardingService(
      repository({
        createTenantOnboarding: async (input) => {
          received = input;
          return { tenantId: "tenant-1", leaseIds: ["lease-1"], virtualAddressIds: [addressId] };
        },
      }),
    );

    await service.createTenant(manager, tenantInput);

    expect(received).toMatchObject({
      ...tenantInput,
      actorUserId,
    });
  });

  it("requires at least one unit or virtual address", async () => {
    const service = createClientOnboardingService(repository());
    await expect(
      service.createTenant(manager, { ...tenantInput, units: [], virtualAddresses: [] }),
    ).rejects.toMatchObject({ code: "ONBOARDING_ASSET_REQUIRED" });
  });

  it("rejects duplicate asset ids before persistence", async () => {
    const service = createClientOnboardingService(repository());
    await expect(
      service.createTenant(manager, {
        ...tenantInput,
        units: [tenantInput.units[0], tenantInput.units[0]],
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_ONBOARDING_ASSET" });
  });

  it("rejects a property outside the manager scope", async () => {
    const service = createClientOnboardingService(repository());
    await expect(
      service.createTenant(manager, { ...tenantInput, propertyId: "99999999-9999-4999-8999-999999999999" }),
    ).rejects.toMatchObject({ code: "PROPERTY_ACCESS_DENIED" });
  });

  it("creates one owner association for every selected authorized property", async () => {
    let received: unknown;
    const service = createClientOnboardingService(
      repository({
        createOwnerOnboarding: async (input) => {
          received = input;
          return { ownerIds: ["owner-1", "owner-2"] };
        },
      }),
    );

    await service.createOwner(manager, {
      propertyIds: [propertyId, otherPropertyId],
      nameAr: "المالك",
      nameEn: "Owner",
      registrationNumber: "CR-O",
    });

    expect(received).toEqual({
      propertyIds: [propertyId, otherPropertyId],
      nameAr: "المالك",
      nameEn: "Owner",
      registrationNumber: "CR-O",
      actorUserId,
    });
  });

  it("rejects duplicate or unauthorized owner properties", async () => {
    const service = createClientOnboardingService(repository());
    await expect(
      service.createOwner(manager, {
        propertyIds: [propertyId, propertyId],
        nameAr: "المالك",
        nameEn: "Owner",
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_PROPERTY" });
    await expect(
      service.createOwner(manager, {
        propertyIds: [propertyId, "99999999-9999-4999-8999-999999999999"],
        nameAr: "المالك",
        nameEn: "Owner",
      }),
    ).rejects.toMatchObject({ code: "PROPERTY_ACCESS_DENIED" });
  });
});
