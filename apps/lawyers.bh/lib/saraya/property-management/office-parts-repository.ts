import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sarayaLeases, sarayaUnits } from "@/lib/db/saraya-schema";
import type { OfficePartsRepository, OfficeUnit } from "./office-parts";

const activeLeaseStatuses = ["active", "renewal_requested"] as const;
const unit = (row: typeof sarayaUnits.$inferSelect): OfficeUnit => ({
  id: row.id,
  propertyId: row.propertyId,
  unitNumber: row.unitNumber,
  parentUnitId: row.parentUnitId,
  isRentable: row.isRentable,
  displayNameAr: row.displayNameAr,
  displayNameEn: row.displayNameEn,
  partOrder: row.partOrder,
});

export const officePartsRepository: OfficePartsRepository = {
  async getUnit(propertyId, unitId) {
    const [row] = await db.select().from(sarayaUnits).where(and(
      eq(sarayaUnits.propertyId, propertyId),
      eq(sarayaUnits.id, unitId),
    )).limit(1);
    return row ? unit(row) : null;
  },
  async listParts(propertyId, parentUnitId) {
    const rows = await db.select().from(sarayaUnits).where(and(
      eq(sarayaUnits.propertyId, propertyId),
      eq(sarayaUnits.parentUnitId, parentUnitId),
    )).orderBy(asc(sarayaUnits.partOrder));
    return rows.map(unit);
  },
  async hasBlockingLease(propertyId, unitId) {
    const [row] = await db.select({ id: sarayaLeases.id }).from(sarayaLeases).where(and(
      eq(sarayaLeases.propertyId, propertyId),
      eq(sarayaLeases.unitId, unitId),
      inArray(sarayaLeases.status, activeLeaseStatuses),
    )).limit(1);
    return Boolean(row);
  },
  async divide(input) {
    return db.transaction(async (tx) => {
      const locked = await tx.execute(sql`
        SELECT * FROM saraya_units
        WHERE property_id=${input.propertyId} AND id=${input.parent.id}
        FOR UPDATE
      `);
      const current = locked[0] as typeof sarayaUnits.$inferSelect | undefined;
      if (!current || current.parentUnitId || !current.isRentable) {
        throw Object.assign(new Error("Office cannot be divided"), { code: "OFFICE_ALREADY_DIVIDED", status: 409 });
      }
      const blocking = await tx.select({ id: sarayaLeases.id }).from(sarayaLeases).where(and(
        eq(sarayaLeases.propertyId, input.propertyId),
        eq(sarayaLeases.unitId, input.parent.id),
        inArray(sarayaLeases.status, activeLeaseStatuses),
      )).limit(1);
      if (blocking.length) throw Object.assign(new Error("Office has active lease"), { code: "OFFICE_HAS_ACTIVE_LEASE", status: 409 });
      const [parent] = await tx.update(sarayaUnits).set({ isRentable: false, updatedAt: new Date() }).where(and(
        eq(sarayaUnits.propertyId, input.propertyId),
        eq(sarayaUnits.id, input.parent.id),
        eq(sarayaUnits.isRentable, true),
      )).returning();
      const parts = await tx.insert(sarayaUnits).values(input.parts.map((part, index) => ({
        propertyId: input.propertyId,
        unitNumber: `${input.parent.unitNumber}-P${String(index + 1).padStart(2, "0")}`,
        parentUnitId: input.parent.id,
        isRentable: true,
        partOrder: index + 1,
        displayNameAr: part.nameAr,
        displayNameEn: part.nameEn,
        floor: current.floor,
        ownerId: current.ownerId,
        unitTypeId: current.unitTypeId,
        status: "vacant" as const,
      }))).returning();
      return { parent: unit(parent), parts: parts.map(unit) };
    });
  },
  async addPart(input) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM saraya_units WHERE property_id=${input.propertyId} AND id=${input.parent.id} FOR UPDATE`);
      const [row] = await tx.insert(sarayaUnits).values({
        propertyId: input.propertyId,
        unitNumber: `${input.parent.unitNumber}-P${String(input.partOrder).padStart(2, "0")}`,
        parentUnitId: input.parent.id,
        isRentable: true,
        partOrder: input.partOrder,
        displayNameAr: input.part.nameAr,
        displayNameEn: input.part.nameEn,
        status: "vacant",
      }).returning();
      return unit(row);
    });
  },
  async renamePart(input) {
    const [row] = await db.update(sarayaUnits).set({
      displayNameAr: input.part.nameAr,
      displayNameEn: input.part.nameEn,
      updatedAt: new Date(),
    }).where(and(
      eq(sarayaUnits.propertyId, input.propertyId),
      eq(sarayaUnits.parentUnitId, input.parentUnitId),
      eq(sarayaUnits.id, input.partId),
    )).returning();
    if (!row) throw Object.assign(new Error("Part not found"), { code: "NOT_FOUND", status: 404 });
    return unit(row);
  },
  async removePart(propertyId, parentUnitId, partId) {
    return db.transaction(async (tx) => {
      const removed = await tx.delete(sarayaUnits).where(and(
        eq(sarayaUnits.propertyId, propertyId),
        eq(sarayaUnits.parentUnitId, parentUnitId),
        eq(sarayaUnits.id, partId),
      )).returning({ id: sarayaUnits.id });
      if (!removed.length) return false;
      const remaining = await tx.select({ id: sarayaUnits.id }).from(sarayaUnits).where(and(
        eq(sarayaUnits.propertyId, propertyId),
        eq(sarayaUnits.parentUnitId, parentUnitId),
      )).limit(1);
      if (!remaining.length) await tx.update(sarayaUnits).set({ isRentable: true, updatedAt: new Date() }).where(and(
        eq(sarayaUnits.propertyId, propertyId),
        eq(sarayaUnits.id, parentUnitId),
      ));
      return true;
    });
  },
};
