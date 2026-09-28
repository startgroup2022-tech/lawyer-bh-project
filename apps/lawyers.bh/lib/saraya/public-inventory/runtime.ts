import { and, asc, eq, inArray, notExists, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  sarayaProperties,
  sarayaRentalRequests,
  sarayaUnits,
  sarayaUnitTypes,
  sarayaVirtualAddresses,
} from "@/lib/db/saraya-schema";
import { createPublicInventoryService } from "./service";

const publicUnitSelection = {
  id: sarayaUnits.id,
  propertyId: sarayaUnits.propertyId,
  propertyNameAr: sarayaProperties.nameAr,
  propertyNameEn: sarayaProperties.nameEn,
  unitNumber: sarayaUnits.unitNumber,
  unitType: sarayaUnitTypes.catalogKind,
  displayNameAr: sarayaUnits.displayNameAr,
  displayNameEn: sarayaUnits.displayNameEn,
  descriptionAr: sarayaUnits.descriptionAr,
  descriptionEn: sarayaUnits.descriptionEn,
  imageKey: sarayaUnits.imageKey,
  floor: sarayaUnits.floor,
  marketRent: sarayaUnits.marketRent,
  areaSquareMeters: sarayaUnits.areaSquareMeters,
  availableFrom: sarayaUnits.availableFrom,
};

function availableUnitWhere() {
  return and(
    eq(sarayaUnits.status, "vacant"),
    eq(sarayaUnits.isRentable, true),
    eq(sarayaUnits.isPublicListing, true),
    eq(sarayaProperties.isActive, true),
    notExists(
      db
        .select({ id: sarayaRentalRequests.id })
        .from(sarayaRentalRequests)
        .where(and(
          eq(sarayaRentalRequests.propertyId, sarayaUnits.propertyId),
          eq(sarayaRentalRequests.unitId, sarayaUnits.id),
          inArray(sarayaRentalRequests.status, [
            "pending_owner_review",
            "approved_awaiting_payment",
            "paid_awaiting_signature",
          ]),
        )),
    ),
  );
}

function loadAvailableUnits(limit: number, offset: number) {
  return db
    .select(publicUnitSelection)
    .from(sarayaUnits)
    .innerJoin(sarayaProperties, eq(sarayaProperties.id, sarayaUnits.propertyId))
    .innerJoin(
      sarayaUnitTypes,
      and(
        eq(sarayaUnitTypes.id, sarayaUnits.unitTypeId),
        eq(sarayaUnitTypes.propertyId, sarayaUnits.propertyId),
      ),
    )
    .where(availableUnitWhere())
    .orderBy(asc(sarayaUnits.unitNumber), asc(sarayaUnits.id))
    .limit(limit)
    .offset(offset);
}

type PublicUnitRow = Awaited<ReturnType<typeof loadAvailableUnits>>[number];

function mapPublicUnit(row: PublicUnitRow) {
  return {
    ...row,
    unitType: row.unitType === "shop" ? "shop" as const : "office" as const,
    displayNameAr: row.displayNameAr ?? `مكتب ${row.unitNumber}`,
    displayNameEn: row.displayNameEn ?? `Office ${row.unitNumber}`,
    descriptionAr: row.descriptionAr ?? "مكتب متاح للإيجار في سرايا سكوير",
    descriptionEn: row.descriptionEn ?? "Office available to rent at Saraya Square",
    imageKey: row.imageKey ?? "office_101",
    status: "vacant" as const,
  };
}

export const publicInventoryService = createPublicInventoryService({
  async listAvailable(limit, offset) {
    return (await loadAvailableUnits(limit, offset)).map(mapPublicUnit);
  },
  async getDetail(unitId) {
    const [row] = await db
      .select({
        ...publicUnitSelection,
        marketRent: sql<string>`COALESCE(${sarayaUnits.marketRent}, ${sarayaUnitTypes.defaultRent})::text`,
        depositAmount: sql<string>`'0.000'::text`,
        feeAmount: sql<string>`'0.000'::text`,
        currency: sql<"BHD">`'BHD'::text`,
        approvalMode: sql<"instant" | "owner_review">`COALESCE(${sarayaUnits.rentalApprovalOverride}, ${sarayaProperties.rentalApprovalMode})`,
      })
      .from(sarayaUnits)
      .innerJoin(sarayaProperties, eq(sarayaProperties.id, sarayaUnits.propertyId))
      .innerJoin(
        sarayaUnitTypes,
        and(
          eq(sarayaUnitTypes.id, sarayaUnits.unitTypeId),
          eq(sarayaUnitTypes.propertyId, sarayaUnits.propertyId),
        ),
      )
      .where(and(availableUnitWhere(), eq(sarayaUnits.id, unitId)))
      .limit(1);
    if (!row) return null;
    return {
      ...mapPublicUnit(row),
      depositAmount: row.depositAmount,
      feeAmount: row.feeAmount,
      currency: row.currency,
      approvalMode: row.approvalMode,
    };
  },
  async countVirtualAddresses() {
    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        available: sql<number>`count(*) filter (where ${sarayaVirtualAddresses.status} = 'available')::int`,
      })
      .from(sarayaVirtualAddresses)
      .innerJoin(sarayaProperties, eq(sarayaProperties.id, sarayaVirtualAddresses.propertyId))
      .where(eq(sarayaProperties.isActive, true));
    return {
      total: Number(row?.total ?? 0),
      available: Number(row?.available ?? 0),
    };
  },
});
