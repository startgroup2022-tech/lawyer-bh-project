import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { InvoiceRepository } from "./invoice-service";

export const invoiceRepository: InvoiceRepository = {
  async list(scope) {
    const rows = await db.execute(sql`
      SELECT i.id, i.property_id AS "propertyId", i.rental_request_id AS "rentalRequestId",
             i.number, i.status, i.issue_date AS "issueDate", i.due_date AS "dueDate",
             i.total_amount::text AS "totalAmount", i.paid_amount::text AS "paidAmount",
             i.currency, r.unit_id AS "unitId", u.unit_number AS "unitNumber",
             d.id AS "paymentDemandId", d.status AS "paymentStatus", d.payment_url AS "paymentUrl"
      FROM saraya_invoices i
      JOIN saraya_rental_requests r
        ON r.property_id=i.property_id AND r.id=i.rental_request_id
      JOIN saraya_units u
        ON u.property_id=r.property_id AND u.id=r.unit_id
      LEFT JOIN saraya_payment_demands d
        ON d.property_id=i.property_id AND d.invoice_id=i.id
      WHERE (${scope.propertyId ?? null}::uuid IS NULL OR i.property_id=${scope.propertyId ?? null})
        AND (${scope.tenantUserId ?? null}::uuid IS NULL OR i.tenant_user_id=${scope.tenantUserId ?? null})
        AND (${scope.ownerId ?? null}::uuid IS NULL OR u.owner_id=${scope.ownerId ?? null})
      ORDER BY i.due_date DESC, i.created_at DESC
      LIMIT 100
    `);
    return rows as unknown[];
  },
  async listTargets(propertyId) {
    const rows = await db.execute(sql`
      SELECT r.id AS "rentalRequestId", u.unit_number AS "unitNumber",
             COALESCE(t.name_ar, su.display_name_ar) AS "tenantNameAr",
             COALESCE(t.name_en, su.display_name_en) AS "tenantNameEn"
      FROM saraya_rental_requests r
      JOIN saraya_units u ON u.property_id=r.property_id AND u.id=r.unit_id
      JOIN saraya_users su ON su.id=r.tenant_user_id
      LEFT JOIN saraya_tenant_organizations t
        ON t.property_id=r.property_id AND t.id=r.tenant_organization_id
      WHERE r.property_id=${propertyId}
        AND r.status IN ('approved_awaiting_payment', 'paid_awaiting_signature', 'completed')
      ORDER BY u.unit_number, r.created_at DESC
    `);
    return rows as unknown[];
  },
  async create(input) {
    await db.transaction(async (tx) => {
      const requests = await tx.execute(sql`
        SELECT id, tenant_user_id AS "tenantUserId", status
        FROM saraya_rental_requests
        WHERE property_id=${input.propertyId} AND id=${input.rentalRequestId}
        FOR SHARE
      `);
      const request = (requests as unknown as Array<{ id: string; tenantUserId: string; status: string }>)[0];
      if (!request || !["approved_awaiting_payment", "paid_awaiting_signature", "completed"].includes(request.status)) {
        throw new Error("INVOICE_RENTAL_REQUEST_NOT_FOUND");
      }
      await tx.execute(sql`
        INSERT INTO saraya_invoices
          (id, property_id, rental_request_id, tenant_user_id, status, number,
           issue_date, due_date, subtotal_amount, total_amount, paid_amount, currency)
        VALUES
          (${input.id}, ${input.propertyId}, ${input.rentalRequestId}, ${request.tenantUserId},
           ${input.status}::saraya_invoice_status, ${input.number}, ${input.issueDate}, ${input.dueDate},
           ${input.amount}, ${input.amount}, '0.000', ${input.currency})
      `);
      await tx.execute(sql`
        INSERT INTO saraya_invoice_items
          (property_id, invoice_id, kind, description_ar, description_en, quantity, unit_amount, amount)
        VALUES
          (${input.propertyId}, ${input.id}, 'other', ${input.description}, ${input.description},
           '1.000', ${input.amount}, ${input.amount})
      `);
      await tx.execute(sql`
        INSERT INTO saraya_audit_logs
          (property_id, actor_user_id, action, entity_type, entity_id, after)
        VALUES
          (${input.propertyId}, ${input.actorUserId}, 'invoice.created', 'invoice', ${input.id},
           jsonb_build_object('number', ${input.number}, 'rentalRequestId', ${input.rentalRequestId},
                              'amount', ${input.amount}, 'status', ${input.status}))
      `);
    });
    const item = (await this.list({ propertyId: input.propertyId }) as Array<{ id: string }>).find((candidate) => candidate.id === input.id);
    if (!item) throw new Error("INVOICE_CREATE_READBACK_FAILED");
    return item;
  },
};
