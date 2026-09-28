import { ApiError } from "../auth/contracts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PublicUnit {
  id: string;
  propertyId: string;
  propertyNameAr: string;
  propertyNameEn: string;
  unitNumber: string;
  unitType: "office" | "shop";
  displayNameAr: string;
  displayNameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  imageKey: string;
  floor: string | null;
  marketRent: string | null;
  areaSquareMeters: string | null;
  availableFrom: string | null;
  status: "vacant";
}

export type PublicApprovalMode = "instant" | "owner_review";

export interface PublicUnitDetail extends PublicUnit {
  depositAmount: string;
  feeAmount: string;
  currency: "BHD";
  approvalMode: PublicApprovalMode;
}

export interface PublicVirtualAddressSummary {
  total: number;
  available: number;
}

export interface PublicHomeInventory {
  units: PublicUnit[];
  virtualAddresses: PublicVirtualAddressSummary;
}

export function createPublicInventoryService(deps: {
  listAvailable(limit: number, offset: number): Promise<PublicUnit[]>;
  getDetail(unitId: string): Promise<PublicUnitDetail | null>;
  countVirtualAddresses?(): Promise<PublicVirtualAddressSummary>;
}) {
  return {
    async detail(unitId: string): Promise<PublicUnitDetail> {
      if (!uuidPattern.test(unitId)) {
        throw new ApiError(404, "PUBLIC_UNIT_NOT_FOUND", "الوحدة غير متاحة", "The unit is not available");
      }
      const row = await deps.getDetail(unitId);
      if (!row) {
        throw new ApiError(404, "PUBLIC_UNIT_NOT_FOUND", "الوحدة غير متاحة", "The unit is not available");
      }
      return {
        id: row.id,
        propertyId: row.propertyId,
        propertyNameAr: row.propertyNameAr,
        propertyNameEn: row.propertyNameEn,
        unitNumber: row.unitNumber,
        unitType: row.unitType,
        displayNameAr: row.displayNameAr,
        displayNameEn: row.displayNameEn,
        descriptionAr: row.descriptionAr,
        descriptionEn: row.descriptionEn,
        imageKey: row.imageKey,
        floor: row.floor,
        marketRent: row.marketRent,
        areaSquareMeters: row.areaSquareMeters,
        availableFrom: row.availableFrom,
        status: "vacant",
        depositAmount: row.depositAmount,
        feeAmount: row.feeAmount,
        currency: "BHD",
        approvalMode: row.approvalMode,
      };
    },
    async list(limit = 24, cursor?: string) {
      const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit) || 24));
      const parsedCursor = Number(cursor);
      const offset = Number.isSafeInteger(parsedCursor) && parsedCursor >= 0
        ? parsedCursor
        : 0;
      const rows = await deps.listAvailable(safeLimit + 1, offset);
      const hasNextPage = rows.length > safeLimit;
      return {
        items: rows.slice(0, safeLimit),
        nextCursor: hasNextPage ? String(offset + safeLimit) : null,
      };
    },
    async home(limit = 12): Promise<PublicHomeInventory> {
      const safeLimit = Math.max(1, Math.min(24, Math.trunc(limit) || 12));
      const [units, virtualAddresses] = await Promise.all([
        deps.listAvailable(safeLimit, 0),
        deps.countVirtualAddresses?.() ??
          Promise.resolve({ total: 0, available: 0 }),
      ]);
      return {
        units,
        virtualAddresses: {
          total: Math.max(0, Number(virtualAddresses.total) || 0),
          available: Math.max(0, Number(virtualAddresses.available) || 0),
        },
      };
    },
  };
}
