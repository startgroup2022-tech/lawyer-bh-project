import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { RentalStatusRepository, RentalStatusRow } from "./status-service";

export const rentalStatusRepository: RentalStatusRepository = {
  async find(requestId) {
    const rows = await db.execute(sql`
      SELECT r.id, r.property_id AS "propertyId", r.unit_id AS "unitId",
             r.tenant_user_id AS "tenantUserId", u.owner_id AS "ownerId",
             r.status, r.resolved_approval_mode AS "resolvedApprovalMode",
             r.decision_reason AS "decisionReason", r.created_at AS "createdAt",
             r.decided_at AS "decidedAt", d.id AS "paymentDemandId",
             d.status AS "paymentStatus", d.amount::text AS "totalAmount",
             d.currency, d.updated_at AS "paymentUpdatedAt", r.lease_id AS "leaseId",
             l.status AS "leaseStatus", p.lease_checksum AS "leaseChecksum",
             (p.draft_document_id IS NOT NULL) AS "draftDocumentAvailable",
             (p.final_document_id IS NOT NULL) AS "finalDocumentAvailable",
             tenant_signature.signed_at AS "tenantSignedAt",
             owner_signature.signed_at AS "ownerSignedAt",
             p.finalized_at AS "finalizedAt", l.updated_at AS "leaseUpdatedAt"
      FROM saraya_rental_requests r
      JOIN saraya_units u ON u.property_id=r.property_id AND u.id=r.unit_id
      LEFT JOIN saraya_payment_demands d ON d.property_id=r.property_id AND d.rental_request_id=r.id
      LEFT JOIN saraya_leases l ON l.property_id=r.property_id AND l.id=r.lease_id
      LEFT JOIN saraya_lease_packages p ON p.property_id=r.property_id AND p.lease_id=l.id
      LEFT JOIN saraya_lease_signature_requests tenant_signature
        ON tenant_signature.property_id=r.property_id AND tenant_signature.lease_id=l.id
       AND tenant_signature.signer_role='tenant' AND tenant_signature.status='signed'
      LEFT JOIN saraya_lease_signature_requests owner_signature
        ON owner_signature.property_id=r.property_id AND owner_signature.lease_id=l.id
       AND owner_signature.signer_role='owner' AND owner_signature.status='signed'
      WHERE r.id=${requestId}
      LIMIT 1
    `);
    return (rows as unknown as RentalStatusRow[])[0] ?? null;
  },
};
