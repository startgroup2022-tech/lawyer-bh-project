import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { DashboardRepository } from "./service";

export const dashboardRepository: DashboardRepository = {
  async summarize(propertyId, scope) {
    const ownerId = scope.ownerId ?? null;
    const rows = await db.execute(sql`
      SELECT
        p.currency_code AS "currencyCode",
        COALESCE(units.occupied_units, 0)::integer AS "occupiedUnits",
        COALESCE(units.vacant_units, 0)::integer AS "vacantUnits",
        COALESCE(tenants.tenant_count, 0)::integer AS "tenantCount",
        COALESCE(requests.pending_requests, 0)::integer AS "pendingRequests",
        COALESCE(finance.due_amount, 0)::numeric(14,3)::text AS "dueAmount",
        COALESCE(finance.paid_amount, 0)::numeric(14,3)::text AS "paidAmount",
        COALESCE(finance.overdue_amount, 0)::numeric(14,3)::text AS "overdueAmount"
      FROM saraya_properties p
      LEFT JOIN LATERAL (
        SELECT
          count(*) FILTER (WHERE u.status = 'occupied') AS occupied_units,
          count(*) FILTER (WHERE u.status = 'vacant') AS vacant_units
        FROM saraya_units u
        WHERE u.property_id = p.id
          AND (${ownerId}::uuid IS NULL OR u.owner_id = ${ownerId})
      ) units ON true
      LEFT JOIN LATERAL (
        SELECT count(DISTINCT l.tenant_organization_id) AS tenant_count
        FROM saraya_leases l
        JOIN saraya_units u
          ON u.property_id = l.property_id AND u.id = l.unit_id
        WHERE l.property_id = p.id
          AND (${ownerId}::uuid IS NULL OR u.owner_id = ${ownerId})
      ) tenants ON true
      LEFT JOIN LATERAL (
        SELECT count(*) AS pending_requests
        FROM saraya_rental_requests r
        JOIN saraya_units u
          ON u.property_id = r.property_id AND u.id = r.unit_id
        WHERE r.property_id = p.id
          AND r.status = 'pending_owner_review'
          AND (${ownerId}::uuid IS NULL OR u.owner_id = ${ownerId})
      ) requests ON true
      LEFT JOIN LATERAL (
        SELECT
          sum(i.total_amount - i.paid_amount)
            FILTER (WHERE i.status NOT IN ('paid', 'cancelled', 'refunded')) AS due_amount,
          sum(i.paid_amount) AS paid_amount,
          sum(i.total_amount - i.paid_amount)
            FILTER (
              WHERE i.due_date < CURRENT_DATE
                AND i.status NOT IN ('paid', 'cancelled', 'refunded')
            ) AS overdue_amount
        FROM saraya_invoices i
        JOIN saraya_rental_requests r
          ON r.property_id = i.property_id AND r.id = i.rental_request_id
        JOIN saraya_units u
          ON u.property_id = r.property_id AND u.id = r.unit_id
        WHERE i.property_id = p.id
          AND (${ownerId}::uuid IS NULL OR u.owner_id = ${ownerId})
      ) finance ON true
      WHERE p.id = ${propertyId}
      LIMIT 1
    `);
    const summary = rows[0] as
      | {
          occupiedUnits: number;
          vacantUnits: number;
          tenantCount: number;
          pendingRequests: number;
          dueAmount: string;
          paidAmount: string;
          overdueAmount: string;
          currencyCode: string;
        }
      | undefined;
    return {
      occupiedUnits: Number(summary?.occupiedUnits ?? 0),
      vacantUnits: Number(summary?.vacantUnits ?? 0),
      tenantCount: Number(summary?.tenantCount ?? 0),
      pendingRequests: Number(summary?.pendingRequests ?? 0),
      dueAmount: summary?.dueAmount ?? "0.000",
      paidAmount: summary?.paidAmount ?? "0.000",
      overdueAmount: summary?.overdueAmount ?? "0.000",
      currencyCode: summary?.currencyCode ?? "BHD",
    };
  },
};
