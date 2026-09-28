import { and, eq, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sarayaLeaseEvents, sarayaLeases, sarayaLeaseVersions, sarayaRentScheduleItems, sarayaUnits } from "@/lib/db/saraya-schema";
import type { LeaseTerms, RentScheduleItem } from "./contracts";
import type { LeaseRepository, StoredLease } from "./service";

const decimal = (minor: string) => `${BigInt(minor) / BigInt(1000)}.${String(BigInt(minor) % BigInt(1000)).padStart(3, "0")}`;

export const leaseRepository: LeaseRepository = {
  async transaction(work) {
    return db.transaction(async (tx) => work({
      ...leaseRepository,
      transaction: async (nested) => nested(leaseRepository),
      async getForUpdate(propertyId, leaseId) {
        const rows = await tx.execute(sql`SELECT l.id, l.property_id AS "propertyId", l.unit_id AS "unitId", l.tenant_organization_id AS "tenantOrganizationId", l.status, l.current_version AS "currentVersion", u.is_rentable AS "isRentable", v.start_date AS "startDate", v.end_date AS "endDate", v.rent_amount::text AS "rentAmount", v.deposit_amount::text AS "depositAmount", v.frequency, v.due_day AS "dueDay", v.grace_days AS "graceDays", v.discount_amount::text AS "discountAmount", v.fee_amount::text AS "feeAmount" FROM saraya_leases l JOIN saraya_units u ON u.property_id=l.property_id AND u.id=l.unit_id JOIN saraya_lease_versions v ON v.property_id=l.property_id AND v.lease_id=l.id AND v.version=l.current_version WHERE l.property_id=${propertyId} AND l.id=${leaseId} FOR UPDATE OF l,u`);
        const row = rows[0] as unknown as (StoredLease & LeaseTerms) | undefined;
        return row ? { id: row.id, propertyId: row.propertyId, unitId: row.unitId, tenantOrganizationId: row.tenantOrganizationId, status: row.status, currentVersion: row.currentVersion, isRentable: row.isRentable, terms: { startDate: row.startDate, endDate: row.endDate, rentAmount: row.rentAmount, depositAmount: row.depositAmount, frequency: row.frequency, dueDay: row.dueDay, graceDays: row.graceDays, discountAmount: row.discountAmount, feeAmount: row.feeAmount } } : null;
      },
      async hasOverlappingActiveLease(propertyId, unitId, startDate, endDate, excludingLeaseId) {
        if (!startDate || !endDate) return false;
        const rows = await tx.select({ id: sarayaLeases.id }).from(sarayaLeases).innerJoin(sarayaLeaseVersions, and(eq(sarayaLeaseVersions.leaseId, sarayaLeases.id), eq(sarayaLeaseVersions.version, sarayaLeases.currentVersion))).where(and(eq(sarayaLeases.propertyId, propertyId), eq(sarayaLeases.unitId, unitId), ne(sarayaLeases.id, excludingLeaseId), or(eq(sarayaLeases.status, "active"), eq(sarayaLeases.status, "renewal_requested")), sql`${sarayaLeaseVersions.startDate} <= ${endDate}`, sql`${sarayaLeaseVersions.endDate} >= ${startDate}`)).limit(1);
        return rows.length > 0;
      },
      async appendVersionAndTransition(input) {
        let versionId: string | undefined;
        let nextVersion = input.expectedVersion;
        if (input.command.type === "approve_renewal" && input.terms) {
          nextVersion += 1;
          const [version] = await tx.insert(sarayaLeaseVersions).values({ propertyId: input.propertyId, leaseId: input.leaseId, version: nextVersion, ...input.terms, createdByUserId: input.actorUserId }).returning({ id: sarayaLeaseVersions.id });
          versionId = version.id;
        } else if (input.command.type === "approve") {
          const [version] = await tx.select({ id: sarayaLeaseVersions.id }).from(sarayaLeaseVersions).where(and(eq(sarayaLeaseVersions.leaseId, input.leaseId), eq(sarayaLeaseVersions.version, input.expectedVersion))).limit(1);
          versionId = version?.id;
        }
        if (input.schedule?.length && versionId) await tx.insert(sarayaRentScheduleItems).values(input.schedule.map((item: RentScheduleItem) => ({ propertyId: input.propertyId, leaseId: input.leaseId, leaseVersionId: versionId!, sequence: item.sequence, periodStart: item.periodStart, periodEnd: item.periodEnd, dueDate: item.dueDate, graceUntil: item.graceUntil, baseAmount: decimal(item.baseMinor), discountAmount: decimal(item.discountMinor), feeAmount: decimal(item.feeMinor), totalAmount: decimal(item.totalMinor) })));
        const [updated] = await tx.update(sarayaLeases).set({ status: input.nextStatus, currentVersion: nextVersion, updatedAt: new Date() }).where(and(eq(sarayaLeases.propertyId, input.propertyId), eq(sarayaLeases.id, input.leaseId), eq(sarayaLeases.currentVersion, input.expectedVersion))).returning();
        if (!updated) throw new Error("LEASE_CONCURRENT_UPDATE");
        await tx.insert(sarayaLeaseEvents).values({ propertyId: input.propertyId, leaseId: input.leaseId, fromStatus: input.previousStatus, toStatus: input.nextStatus, command: input.command.type, actorUserId: input.actorUserId, reason: "reason" in input.command ? input.command.reason?.trim() || null : null });
        if (input.unitStatus === "occupied") await tx.update(sarayaUnits).set({ status: "occupied", updatedAt: new Date() }).where(and(eq(sarayaUnits.propertyId, input.propertyId), eq(sarayaUnits.id, updated.unitId)));
        if (input.unitStatus === "vacant") await tx.execute(sql`UPDATE saraya_units u SET status='vacant', updated_at=now() WHERE u.property_id=${input.propertyId} AND u.id=${updated.unitId} AND NOT EXISTS (SELECT 1 FROM saraya_leases l WHERE l.property_id=u.property_id AND l.unit_id=u.id AND l.id<>${input.leaseId} AND l.status IN ('active','renewal_requested'))`);
        return updated;
      },
    }));
  },
  async getForUpdate() { throw new Error("Lease repository methods require a transaction"); },
  async hasOverlappingActiveLease() { throw new Error("Lease repository methods require a transaction"); },
  async appendVersionAndTransition() { throw new Error("Lease repository methods require a transaction"); },
};
