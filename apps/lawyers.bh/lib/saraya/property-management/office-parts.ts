import { authorize } from "../access/authorize";
import { ApiError, type SarayaPrincipal } from "../auth/contracts";

export interface OfficeUnit {
  id: string;
  propertyId: string;
  unitNumber: string;
  parentUnitId: string | null;
  isRentable: boolean;
  displayNameAr?: string | null;
  displayNameEn?: string | null;
  partOrder?: number | null;
}
export interface OfficePartInput { nameAr: string; nameEn?: string }
export interface OfficeDivision { parent: OfficeUnit; parts: OfficeUnit[] }
export interface OfficePartsRepository {
  getUnit(propertyId: string, unitId: string): Promise<OfficeUnit | null>;
  listParts(propertyId: string, parentUnitId: string): Promise<OfficeUnit[]>;
  hasBlockingLease(propertyId: string, unitId: string): Promise<boolean>;
  divide(input: { propertyId: string; parent: OfficeUnit; parts: Required<OfficePartInput>[] }): Promise<OfficeDivision>;
  addPart(input: { propertyId: string; parent: OfficeUnit; part: Required<OfficePartInput>; partOrder: number }): Promise<OfficeUnit>;
  renamePart(input: { propertyId: string; parentUnitId: string; partId: string; part: Required<OfficePartInput> }): Promise<OfficeUnit>;
  removePart(propertyId: string, parentUnitId: string, partId: string): Promise<boolean>;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const failure = (status: number, code: string, ar: string, en: string) =>
  new ApiError(status, code, ar, en);

function normalizeParts(parts: OfficePartInput[]): Required<OfficePartInput>[] {
  if (parts.length < 2 || parts.length > 10) {
    throw failure(422, "INVALID_PART_COUNT", "عدد الأجزاء يجب أن يكون بين 2 و10", "Part count must be between 2 and 10");
  }
  const normalized = parts.map((part) => {
    const nameAr = typeof part.nameAr === "string" ? part.nameAr.trim() : "";
    const nameEn = typeof part.nameEn === "string" && part.nameEn.trim() ? part.nameEn.trim() : nameAr;
    if (!nameAr || nameAr.length > 255 || nameEn.length > 255) {
      throw failure(422, "INVALID_PART_NAME", "اسم الجزء غير صالح", "Invalid part name");
    }
    return { nameAr, nameEn };
  });
  const keys = normalized.map((part) => part.nameAr.toLocaleLowerCase("ar"));
  if (new Set(keys).size !== keys.length) {
    throw failure(409, "DUPLICATE_PART_NAME", "أسماء الأجزاء يجب أن تكون مختلفة", "Part names must be unique");
  }
  return normalized;
}

export function createOfficePartsService(repository: OfficePartsRepository) {
  return {
    async divideOffice(
      principal: SarayaPrincipal,
      propertyId: string,
      parentUnitId: string,
      input: { parts: OfficePartInput[] },
    ): Promise<OfficeDivision> {
      authorize(principal, { propertyId, permission: "units:write" });
      if (!uuid.test(parentUnitId)) {
        throw failure(422, "INVALID_UUID", "معرف المكتب غير صالح", "Invalid office id");
      }
      const parts = normalizeParts(input.parts);
      const parent = await repository.getUnit(propertyId, parentUnitId);
      if (!parent) throw failure(404, "NOT_FOUND", "المكتب غير موجود", "Office not found");
      if (parent.parentUnitId) {
        throw failure(409, "OFFICE_PART_CANNOT_BE_DIVIDED", "لا يمكن تقسيم جزء من مكتب", "An office part cannot be divided");
      }
      if ((await repository.listParts(propertyId, parentUnitId)).length || !parent.isRentable) {
        throw failure(409, "OFFICE_ALREADY_DIVIDED", "المكتب مقسم بالفعل", "Office is already divided");
      }
      if (await repository.hasBlockingLease(propertyId, parentUnitId)) {
        throw failure(409, "OFFICE_HAS_ACTIVE_LEASE", "لا يمكن تقسيم مكتب لديه عقد فعال", "Office has an active lease");
      }
      return repository.divide({ propertyId, parent, parts });
    },
    async addOfficePart(
      principal: SarayaPrincipal,
      propertyId: string,
      parentUnitId: string,
      input: OfficePartInput,
    ): Promise<OfficeUnit> {
      authorize(principal, { propertyId, permission: "units:write" });
      const parent = await repository.getUnit(propertyId, parentUnitId);
      if (!parent) throw failure(404, "NOT_FOUND", "المكتب غير موجود", "Office not found");
      if (parent.parentUnitId) throw failure(409, "OFFICE_PART_CANNOT_BE_DIVIDED", "لا يمكن إضافة جزء داخل جزء", "Cannot add a part inside a part");
      const current = await repository.listParts(propertyId, parentUnitId);
      if (!current.length || parent.isRentable) throw failure(409, "OFFICE_NOT_DIVIDED", "المكتب غير مقسم", "Office is not divided");
      if (current.length >= 10) throw failure(409, "PART_LIMIT_EXCEEDED", "الحد الأقصى 10 أجزاء", "Maximum 10 parts");
      const [part] = normalizeParts([input, { nameAr: "__validation_only__" }]);
      if (current.some((item) => item.displayNameAr?.trim().toLocaleLowerCase("ar") === part.nameAr.toLocaleLowerCase("ar"))) {
        throw failure(409, "DUPLICATE_PART_NAME", "اسم الجزء مستخدم", "Part name already exists");
      }
      return repository.addPart({ propertyId, parent, part, partOrder: current.length + 1 });
    },
    async removeOfficePart(
      principal: SarayaPrincipal,
      propertyId: string,
      parentUnitId: string,
      partId: string,
    ): Promise<void> {
      authorize(principal, { propertyId, permission: "units:write" });
      if (!uuid.test(parentUnitId) || !uuid.test(partId)) throw failure(422, "INVALID_UUID", "المعرف غير صالح", "Invalid id");
      const [parent, part] = await Promise.all([
        repository.getUnit(propertyId, parentUnitId),
        repository.getUnit(propertyId, partId),
      ]);
      if (!parent || !part || part.parentUnitId !== parentUnitId) throw failure(404, "NOT_FOUND", "جزء المكتب غير موجود", "Office part not found");
      if (await repository.hasBlockingLease(propertyId, partId)) throw failure(409, "PART_HAS_ACTIVE_LEASE", "لا يمكن حذف جزء لديه عقد فعال", "Office part has an active lease");
      if (!await repository.removePart(propertyId, parentUnitId, partId)) throw failure(404, "NOT_FOUND", "جزء المكتب غير موجود", "Office part not found");
    },
  };
}
