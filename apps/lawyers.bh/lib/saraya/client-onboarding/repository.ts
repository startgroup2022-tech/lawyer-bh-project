import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  sarayaAuditLogs,
  sarayaLeaseVersions,
  sarayaLeases,
  sarayaOwners,
  sarayaProperties,
  sarayaTenantOrganizations,
  sarayaUnits,
  sarayaVirtualAddresses,
} from "@/lib/db/saraya-schema";
import { ApiError } from "../auth/contracts";
import type { ClientOnboardingRepository } from "./service";

function conflict(code: string, messageAr: string, messageEn: string, field: string) {
  return new ApiError(409, code, messageAr, messageEn, { [field]: [code] });
}

export const clientOnboardingRepository: ClientOnboardingRepository = {
  async listProperties(propertyIds) {
    if (!propertyIds.length) return [];
    return db
      .select({
        id: sarayaProperties.id,
        code: sarayaProperties.code,
        nameAr: sarayaProperties.nameAr,
        nameEn: sarayaProperties.nameEn,
        currencyCode: sarayaProperties.currencyCode,
      })
      .from(sarayaProperties)
      .where(and(inArray(sarayaProperties.id, propertyIds), eq(sarayaProperties.isActive, true)))
      .orderBy(asc(sarayaProperties.nameEn));
  },

  async listAvailableUnits(propertyId) {
    return db
      .select({
        id: sarayaUnits.id,
        propertyId: sarayaUnits.propertyId,
        unitNumber: sarayaUnits.unitNumber,
        displayNameAr: sarayaUnits.displayNameAr,
        displayNameEn: sarayaUnits.displayNameEn,
        marketRent: sarayaUnits.marketRent,
      })
      .from(sarayaUnits)
      .where(and(eq(sarayaUnits.propertyId, propertyId), eq(sarayaUnits.status, "vacant"), eq(sarayaUnits.isRentable, true)))
      .orderBy(asc(sarayaUnits.unitNumber));
  },

  async listAvailableVirtualAddresses(propertyId) {
    return db
      .select({
        id: sarayaVirtualAddresses.id,
        propertyId: sarayaVirtualAddresses.propertyId,
        code: sarayaVirtualAddresses.code,
        slotNumber: sarayaVirtualAddresses.slotNumber,
        monthlyFee: sarayaVirtualAddresses.monthlyFee,
      })
      .from(sarayaVirtualAddresses)
      .where(and(eq(sarayaVirtualAddresses.propertyId, propertyId), eq(sarayaVirtualAddresses.status, "available")))
      .orderBy(asc(sarayaVirtualAddresses.slotNumber));
  },

  async createTenantOnboarding(input) {
    return db.transaction(async (tx) => {
      const unitIds = input.units.map((item) => item.unitId);
      const addressIds = input.virtualAddresses.map((item) => item.virtualAddressId);
      if (unitIds.length) {
        const locked = await tx.execute(sql`SELECT id FROM saraya_units WHERE property_id=${input.propertyId} AND id IN (${sql.join(unitIds.map((id) => sql`${id}`), sql`, `)}) AND status='vacant' AND is_rentable=true FOR UPDATE`);
        if (locked.length !== unitIds.length) throw conflict("UNIT_UNAVAILABLE", "إحدى الوحدات لم تعد متاحة", "One or more units are no longer available", "units");
      }
      if (addressIds.length) {
        const locked = await tx.execute(sql`SELECT id FROM saraya_virtual_addresses WHERE property_id=${input.propertyId} AND id IN (${sql.join(addressIds.map((id) => sql`${id}`), sql`, `)}) AND status='available' FOR UPDATE`);
        if (locked.length !== addressIds.length) throw conflict("VIRTUAL_ADDRESS_UNAVAILABLE", "أحد العناوين الافتراضية لم يعد متاحًا", "One or more virtual addresses are no longer available", "virtualAddresses");
      }

      const [tenant] = await tx
        .insert(sarayaTenantOrganizations)
        .values({
          propertyId: input.propertyId,
          nameAr: input.nameAr,
          nameEn: input.nameEn,
          registrationNumber: input.registrationNumber?.trim() || null,
          taxNumber: input.taxNumber?.trim() || null,
          isActive: true,
        })
        .returning({ id: sarayaTenantOrganizations.id });
      const leaseIds: string[] = [];
      for (const selection of input.units) {
        const [lease] = await tx
          .insert(sarayaLeases)
          .values({
            propertyId: input.propertyId,
            unitId: selection.unitId,
            tenantOrganizationId: tenant.id,
            status: "draft",
            currentVersion: 1,
          })
          .returning({ id: sarayaLeases.id });
        leaseIds.push(lease.id);
        await tx.insert(sarayaLeaseVersions).values({
          propertyId: input.propertyId,
          leaseId: lease.id,
          version: 1,
          startDate: selection.startDate,
          endDate: selection.endDate,
          rentAmount: selection.rentAmount,
          depositAmount: selection.depositAmount,
          frequency: selection.frequency,
          dueDay: selection.dueDay,
          graceDays: selection.graceDays,
          discountAmount: "0.000",
          feeAmount: "0.000",
          createdByUserId: input.actorUserId,
        });
        await tx.update(sarayaUnits).set({ status: "reserved", updatedAt: new Date() }).where(and(eq(sarayaUnits.propertyId, input.propertyId), eq(sarayaUnits.id, selection.unitId)));
        await tx.insert(sarayaAuditLogs).values({
          propertyId: input.propertyId,
          actorUserId: input.actorUserId,
          action: "tenant_onboarding.lease_created",
          entityType: "lease",
          entityId: lease.id,
          after: { tenantId: tenant.id, unitId: selection.unitId, status: "draft" },
        });
      }

      for (const selection of input.virtualAddresses) {
        await tx
          .update(sarayaVirtualAddresses)
          .set({
            status: "reserved",
            tenantOrganizationId: tenant.id,
            businessNameAr: selection.businessNameAr.trim() || input.nameAr,
            businessNameEn: selection.businessNameEn.trim() || input.nameEn,
            monthlyFee: selection.monthlyFee,
            startDate: selection.startDate,
            endDate: selection.endDate,
            updatedAt: new Date(),
          })
          .where(and(eq(sarayaVirtualAddresses.propertyId, input.propertyId), eq(sarayaVirtualAddresses.id, selection.virtualAddressId)));
        await tx.insert(sarayaAuditLogs).values({
          propertyId: input.propertyId,
          actorUserId: input.actorUserId,
          action: "tenant_onboarding.virtual_address_reserved",
          entityType: "virtual_address",
          entityId: selection.virtualAddressId,
          after: { tenantId: tenant.id, status: "reserved" },
        });
      }
      await tx.insert(sarayaAuditLogs).values({
        propertyId: input.propertyId,
        actorUserId: input.actorUserId,
        action: "tenant_onboarding.created",
        entityType: "tenant",
        entityId: tenant.id,
        after: { leaseIds, virtualAddressIds: addressIds },
      });
      return { tenantId: tenant.id, leaseIds, virtualAddressIds: addressIds };
    });
  },

  async createOwnerOnboarding(input) {
    return db.transaction(async (tx) => {
      const ownerIds: string[] = [];
      for (const propertyId of input.propertyIds) {
        const duplicateCondition = input.registrationNumber?.trim()
          ? eq(sarayaOwners.registrationNumber, input.registrationNumber.trim())
          : or(eq(sarayaOwners.nameAr, input.nameAr), eq(sarayaOwners.nameEn, input.nameEn));
        const existing = await tx
          .select({ id: sarayaOwners.id })
          .from(sarayaOwners)
          .where(and(eq(sarayaOwners.propertyId, propertyId), duplicateCondition))
          .limit(1);
        if (existing.length) throw conflict("OWNER_PROPERTY_EXISTS", "المالك مرتبط بهذا العقار مسبقًا", "Owner is already linked to this property", "propertyIds");
        const [owner] = await tx
          .insert(sarayaOwners)
          .values({
            propertyId,
            nameAr: input.nameAr,
            nameEn: input.nameEn,
            registrationNumber: input.registrationNumber?.trim() || null,
          })
          .returning({ id: sarayaOwners.id });
        ownerIds.push(owner.id);
        await tx.insert(sarayaAuditLogs).values({
          propertyId,
          actorUserId: input.actorUserId,
          action: "owner_onboarding.created",
          entityType: "owner",
          entityId: owner.id,
          after: { nameAr: input.nameAr, nameEn: input.nameEn },
        });
      }
      return { ownerIds };
    });
  },
};
