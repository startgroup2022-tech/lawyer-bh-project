import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { LeaseListRepository } from "./list-service";

export const leaseListRepository: LeaseListRepository = {
  async list(scope) {
    const rows = await db.execute(sql`
      SELECT l.id,
             l.property_id AS "propertyId",
             l.unit_id AS "unitId",
             l.tenant_organization_id AS "tenantOrganizationId",
             l.status,
             l.current_version AS "currentVersion",
             l.created_at AS "createdAt",
             l.updated_at AS "updatedAt",
             u.unit_number AS "unitNumber",
             u.display_name_ar AS "unitNameAr",
             u.display_name_en AS "unitNameEn",
             t.name_ar AS "tenantNameAr",
             t.name_en AS "tenantNameEn",
             v.start_date AS "startDate",
             v.end_date AS "endDate",
             v.rent_amount::text AS "rentAmount",
             v.deposit_amount::text AS "depositAmount",
             v.frequency,
             v.due_day AS "dueDay",
             v.grace_days AS "graceDays"
      FROM saraya_leases l
      JOIN saraya_units u
        ON u.property_id=l.property_id AND u.id=l.unit_id
      JOIN saraya_tenant_organizations t
        ON t.property_id=l.property_id AND t.id=l.tenant_organization_id
      JOIN saraya_lease_versions v
        ON v.property_id=l.property_id
       AND v.lease_id=l.id
       AND v.version=l.current_version
      WHERE l.property_id=${scope.propertyId}
        AND (${scope.ownerId ?? null}::uuid IS NULL OR u.owner_id=${scope.ownerId ?? null})
        AND (${scope.tenantId ?? null}::uuid IS NULL OR l.tenant_organization_id=${scope.tenantId ?? null})
      ORDER BY v.end_date DESC, l.updated_at DESC
      LIMIT 200
    `);
    return rows as unknown[];
  },
};
