import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  sarayaTenantOrganizations,
  sarayaAuditLogs,
  sarayaVirtualAddresses,
} from "@/lib/db/saraya-schema";
import type { VirtualAddressRepository } from "./service";
import type { VirtualAddressStatus } from "./contracts";

const statuses = new Set<VirtualAddressStatus>([
  "available",
  "reserved",
  "active",
  "suspended",
  "inactive",
]);

function statusOf(value: string): VirtualAddressStatus {
  if (!statuses.has(value as VirtualAddressStatus)) {
    throw new Error("INVALID_VIRTUAL_ADDRESS_STATUS");
  }
  return value as VirtualAddressStatus;
}

export const virtualAddressRepository: VirtualAddressRepository = {
  async list(propertyId) {
    const rows = await db
      .select({
        id: sarayaVirtualAddresses.id,
        propertyId: sarayaVirtualAddresses.propertyId,
        slotNumber: sarayaVirtualAddresses.slotNumber,
        code: sarayaVirtualAddresses.code,
        status: sarayaVirtualAddresses.status,
        tenantOrganizationId: sarayaVirtualAddresses.tenantOrganizationId,
        tenantNameAr: sarayaTenantOrganizations.nameAr,
        tenantNameEn: sarayaTenantOrganizations.nameEn,
        businessNameAr: sarayaVirtualAddresses.businessNameAr,
        businessNameEn: sarayaVirtualAddresses.businessNameEn,
        monthlyFee: sarayaVirtualAddresses.monthlyFee,
        startDate: sarayaVirtualAddresses.startDate,
        endDate: sarayaVirtualAddresses.endDate,
      })
      .from(sarayaVirtualAddresses)
      .leftJoin(
        sarayaTenantOrganizations,
        eq(
          sarayaTenantOrganizations.id,
          sarayaVirtualAddresses.tenantOrganizationId,
        ),
      )
      .where(eq(sarayaVirtualAddresses.propertyId, propertyId))
      .orderBy(asc(sarayaVirtualAddresses.slotNumber));
    return rows.map((row) => ({ ...row, status: statusOf(row.status) }));
  },
  async update(input) {
    await db.transaction(async (tx) => {
      const [before] = await tx.select().from(sarayaVirtualAddresses).where(and(
        eq(sarayaVirtualAddresses.propertyId, input.propertyId),
        eq(sarayaVirtualAddresses.id, input.id),
      )).limit(1);
      if (!before) throw new Error("VIRTUAL_ADDRESS_NOT_FOUND");
      const [after] = await tx.update(sarayaVirtualAddresses).set({
        status: input.status,
        tenantOrganizationId: input.tenantOrganizationId,
        businessNameAr: input.businessNameAr,
        businessNameEn: input.businessNameEn,
        monthlyFee: input.monthlyFee,
        startDate: input.startDate,
        endDate: input.endDate,
        updatedAt: new Date(),
      }).where(and(
        eq(sarayaVirtualAddresses.propertyId, input.propertyId),
        eq(sarayaVirtualAddresses.id, input.id),
      )).returning();
      await tx.insert(sarayaAuditLogs).values({
        propertyId: input.propertyId,
        actorUserId: input.actorUserId,
        action: "virtual_address.updated",
        entityType: "virtual_address",
        entityId: input.id,
        before,
        after,
      });
    });
    const item = (await this.list(input.propertyId)).find((candidate) => candidate.id === input.id);
    if (!item) throw new Error("VIRTUAL_ADDRESS_NOT_FOUND");
    return item;
  },
};
