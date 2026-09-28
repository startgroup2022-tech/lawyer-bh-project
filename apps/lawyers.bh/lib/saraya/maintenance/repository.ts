import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sarayaAuditLogs, sarayaMaintenanceTickets } from "@/lib/db/saraya-schema";
import type { MaintenanceRepository } from "./service";

export const maintenanceRepository: MaintenanceRepository = {
  async list(scope) {
    const rows = await db.execute(sql`
      SELECT ticket.id,
             ticket.property_id AS "propertyId",
             ticket.unit_id AS "unitId",
             ticket.tenant_organization_id AS "tenantOrganizationId",
             ticket.ticket_number AS "ticketNumber",
             ticket.title,
             ticket.description,
             ticket.priority,
             ticket.status,
             ticket.expense_amount::text AS "expenseAmount",
             ticket.resolved_at AS "resolvedAt",
             ticket.created_at AS "createdAt",
             ticket.updated_at AS "updatedAt",
             unit.unit_number AS "unitNumber",
             tenant.name_ar AS "tenantNameAr",
             tenant.name_en AS "tenantNameEn",
             reporter.display_name_ar AS "reportedByNameAr",
             reporter.display_name_en AS "reportedByNameEn",
             assignee.display_name_ar AS "assignedToNameAr",
             assignee.display_name_en AS "assignedToNameEn"
      FROM saraya_maintenance_tickets ticket
      LEFT JOIN saraya_units unit
        ON unit.property_id=ticket.property_id AND unit.id=ticket.unit_id
      LEFT JOIN saraya_tenant_organizations tenant
        ON tenant.property_id=ticket.property_id
       AND tenant.id=ticket.tenant_organization_id
      JOIN saraya_users reporter ON reporter.id=ticket.reported_by_user_id
      LEFT JOIN saraya_users assignee ON assignee.id=ticket.assigned_to_user_id
      WHERE ticket.property_id=${scope.propertyId}
        AND (${scope.ownerId ?? null}::uuid IS NULL OR unit.owner_id=${scope.ownerId ?? null})
        AND (${scope.tenantId ?? null}::uuid IS NULL OR ticket.tenant_organization_id=${scope.tenantId ?? null})
      ORDER BY
        CASE ticket.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        ticket.created_at DESC
      LIMIT 200
    `);
    return rows as unknown[];
  },
  async create(input) {
    const id = randomUUID();
    await db.transaction(async (tx) => {
      const [after] = await tx.insert(sarayaMaintenanceTickets).values({
        id,
        propertyId: input.propertyId,
        reportedByUserId: input.reportedByUserId,
        ticketNumber: `MNT-${id.slice(0, 8).toUpperCase()}`,
        title: input.title.trim(),
        description: input.description.trim(),
        priority: input.priority,
        status: input.status ?? "open",
        expenseAmount: input.expenseAmount ?? "0",
      }).returning();
      await tx.insert(sarayaAuditLogs).values({ propertyId: input.propertyId, actorUserId: input.reportedByUserId, action: "maintenance_ticket.created", entityType: "maintenance_ticket", entityId: id, after });
    });
    return (await this.list({ propertyId: input.propertyId })).find((item: any) => item.id === id)!;
  },
  async update(input) {
    await db.transaction(async (tx) => {
      const [before] = await tx.select().from(sarayaMaintenanceTickets).where(and(eq(sarayaMaintenanceTickets.propertyId, input.propertyId), eq(sarayaMaintenanceTickets.id, input.id))).limit(1);
      if (!before) throw new Error("MAINTENANCE_TICKET_NOT_FOUND");
      const [after] = await tx.update(sarayaMaintenanceTickets).set({
        title: input.title.trim(), description: input.description.trim(), priority: input.priority,
        status: input.status ?? before.status, expenseAmount: input.expenseAmount ?? before.expenseAmount,
        resolvedAt: input.status === "resolved" ? new Date() : before.resolvedAt,
        updatedAt: new Date(),
      }).where(and(eq(sarayaMaintenanceTickets.propertyId, input.propertyId), eq(sarayaMaintenanceTickets.id, input.id))).returning();
      await tx.insert(sarayaAuditLogs).values({ propertyId: input.propertyId, actorUserId: input.actorUserId, action: "maintenance_ticket.updated", entityType: "maintenance_ticket", entityId: input.id, before, after });
    });
    return (await this.list({ propertyId: input.propertyId })).find((item: any) => item.id === input.id)!;
  },
};
