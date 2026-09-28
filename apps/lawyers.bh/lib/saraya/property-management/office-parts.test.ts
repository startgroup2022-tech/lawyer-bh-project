import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import {
  createOfficePartsService,
  type OfficePartsRepository,
  type OfficeUnit,
} from "./office-parts";

const propertyId = "11111111-1111-4111-8111-111111111111";
const parentId = "22222222-2222-4222-8222-222222222222";
const manager: SarayaPrincipal = {
  userId: "33333333-3333-4333-8333-333333333333",
  sessionId: "session",
  propertyIds: [propertyId],
  memberships: [{ propertyId, role: "property_manager" }],
};
const parent: OfficeUnit = {
  id: parentId,
  propertyId,
  unitNumber: "Office 101",
  parentUnitId: null,
  isRentable: true,
};

function repository(overrides: Partial<OfficePartsRepository> = {}): OfficePartsRepository {
  return {
    getUnit: async () => parent,
    listParts: async () => [],
    hasBlockingLease: async () => false,
    divide: async (input) => ({
      parent: { ...parent, isRentable: false },
      parts: input.parts.map((part, index) => ({
        id: `part-${index}`,
        propertyId,
        unitNumber: `Office 101-P${String(index + 1).padStart(2, "0")}`,
        parentUnitId: parentId,
        isRentable: true,
        displayNameAr: part.nameAr,
        displayNameEn: part.nameEn,
        partOrder: index + 1,
      })),
    }),
    addPart: async () => { throw new Error("unused"); },
    renamePart: async () => { throw new Error("unused"); },
    removePart: async () => false,
    ...overrides,
  };
}

describe("shared office parts", () => {
  it("creates 2-10 normalized named parts", async () => {
    const result = await createOfficePartsService(repository()).divideOffice(
      manager,
      propertyId,
      parentId,
      { parts: [{ nameAr: "  مكتب أ  " }, { nameAr: "مكتب ب", nameEn: " Office B " }] },
    );
    expect(result.parent.isRentable).toBe(false);
    expect(result.parts.map((part) => [part.displayNameAr, part.displayNameEn])).toEqual([
      ["مكتب أ", "مكتب أ"],
      ["مكتب ب", "Office B"],
    ]);
  });

  it("rejects a duplicate Arabic name without writing", async () => {
    let divided = false;
    const service = createOfficePartsService(repository({ divide: async () => {
      divided = true;
      throw new Error("must not run");
    } }));
    await expect(service.divideOffice(manager, propertyId, parentId, {
      parts: [{ nameAr: "قسم أ" }, { nameAr: " قسم أ " }],
    })).rejects.toMatchObject({ code: "DUPLICATE_PART_NAME" });
    expect(divided).toBe(false);
  });

  it("rejects dividing a child office", async () => {
    const service = createOfficePartsService(repository({
      getUnit: async () => ({ ...parent, parentUnitId: "another-parent" }),
    }));
    await expect(service.divideOffice(manager, propertyId, parentId, {
      parts: [{ nameAr: "أ" }, { nameAr: "ب" }],
    })).rejects.toMatchObject({ code: "OFFICE_PART_CANNOT_BE_DIVIDED" });
  });

  it("rejects a parent with a blocking lease", async () => {
    const service = createOfficePartsService(repository({ hasBlockingLease: async () => true }));
    await expect(service.divideOffice(manager, propertyId, parentId, {
      parts: [{ nameAr: "أ" }, { nameAr: "ب" }],
    })).rejects.toMatchObject({ code: "OFFICE_HAS_ACTIVE_LEASE" });
  });

  it("adds a uniquely named part up to the limit", async () => {
    let received: unknown;
    const service = createOfficePartsService(repository({
      getUnit: async () => ({ ...parent, isRentable: false }),
      listParts: async () => [{ ...parent, id: "existing", parentUnitId: parentId, displayNameAr: "قسم أ", partOrder: 1 }],
      addPart: async (input) => {
        received = input;
        return { ...parent, id: "new", parentUnitId: parentId, displayNameAr: "قسم ب", displayNameEn: "قسم ب", partOrder: 2 };
      },
    }));
    await service.addOfficePart(manager, propertyId, parentId, { nameAr: " قسم ب " });
    expect(received).toMatchObject({ part: { nameAr: "قسم ب", nameEn: "قسم ب" }, partOrder: 2 });
  });

  it("does not delete a part with a blocking lease", async () => {
    let removed = false;
    const service = createOfficePartsService(repository({
      getUnit: async (_property, id) => id === parentId ? { ...parent, isRentable: false } : { ...parent, id, parentUnitId: parentId },
      hasBlockingLease: async (_property, id) => id !== parentId,
      removePart: async () => { removed = true; return true; },
    }));
    await expect(service.removeOfficePart(manager, propertyId, parentId, "44444444-4444-4444-8444-444444444444"))
      .rejects.toMatchObject({ code: "PART_HAS_ACTIVE_LEASE" });
    expect(removed).toBe(false);
  });
});
