import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { RentalRequestDocumentRecord, RentalRequestListRepository, RentalRequestQueueRow } from "./request-list-service";

export const rentalRequestListRepository: RentalRequestListRepository = {
  async list(scope) {
    return db.execute(sql`
      WITH queue AS (
        SELECT r.id, u.unit_number AS "unitNumber",
               COALESCE(NULLIF(r.applicant_name_en,''), r.applicant_name_ar) AS "applicantDisplayName",
               r.start_date::text AS "startDate", r.end_date::text AS "endDate",
               r.rent_amount::text AS "rentAmount", r.deposit_amount::text AS "depositAmount",
               r.fee_amount::text AS "feeAmount", r.currency,
               r.resolved_approval_mode AS "resolvedApprovalMode", r.status,
               pd.status AS "paymentState", pd.id AS "demandId",
               (identity_doc.id IS NOT NULL) AS "identityDocumentPresent",
               (proof_doc.id IS NOT NULL) AS "paymentProofPresent",
               COALESCE(events.timeline, '[]'::jsonb) AS timeline,
               CASE WHEN r.status='pending_owner_review' THEN 0 WHEN pd.status='verification_pending' THEN 1 ELSE 2 END AS "sortPriority",
               CASE WHEN r.status='pending_owner_review' THEN r.created_at WHEN pd.status='verification_pending' THEN pd.updated_at ELSE r.updated_at END AS "sortAt"
        FROM saraya_rental_requests r
        JOIN saraya_units u ON u.property_id=r.property_id AND u.id=r.unit_id
        LEFT JOIN saraya_documents identity_doc ON identity_doc.property_id=r.property_id AND identity_doc.id=r.id_document_id AND identity_doc.status='active'
        LEFT JOIN saraya_payment_demands pd ON pd.property_id=r.property_id AND pd.rental_request_id=r.id
        LEFT JOIN LATERAL (
          SELECT p.document_id FROM saraya_payment_proofs p
          WHERE p.property_id=r.property_id AND p.payment_demand_id=pd.id AND p.document_id=pd.receipt_document_id
          ORDER BY p.created_at DESC LIMIT 1
        ) current_proof ON TRUE
        LEFT JOIN saraya_documents proof_doc ON proof_doc.property_id=r.property_id AND proof_doc.id=current_proof.document_id AND proof_doc.status='active'
        LEFT JOIN LATERAL (
          SELECT jsonb_agg(jsonb_build_object('event', source.action, 'occurredAt', source.created_at) ORDER BY source.created_at ASC, source.id ASC) AS timeline
          FROM (
            SELECT a.id, a.action, a.created_at FROM saraya_audit_logs a
            WHERE a.property_id=r.property_id AND a.entity_type='rental_request' AND a.entity_id=r.id
            UNION ALL
            SELECT a.id, a.action, a.created_at FROM saraya_audit_logs a
            WHERE pd.id IS NOT NULL AND a.property_id=r.property_id AND a.entity_type='payment_demand' AND a.entity_id=pd.id
          ) source
        ) events ON TRUE
        WHERE r.property_id=${scope.propertyId}
          AND (${scope.ownerId ?? null}::uuid IS NULL OR u.owner_id=${scope.ownerId ?? null})
      )
      SELECT * FROM queue
      WHERE (${scope.cursor?.id ?? null}::uuid IS NULL OR
        ("sortPriority", "sortAt", id) > (${scope.cursor?.priority ?? null}, ${scope.cursor?.sortAt ?? null}::timestamptz, ${scope.cursor?.id ?? null}::uuid))
      ORDER BY "sortPriority" ASC, "sortAt" ASC, id ASC
      LIMIT ${scope.limit}
    `) as unknown as RentalRequestQueueRow[];
  },
  async findDocument(scope) {
    return db.transaction(async (tx) => {
      const rows = scope.kind === "identity"
        ? await tx.execute(sql`
            SELECT r.property_id AS "propertyId", u.owner_id AS "ownerId", d.storage_key AS "storageKey",
                   d.original_name AS "originalName", d.content_type AS "contentType"
            FROM saraya_rental_requests r
            JOIN saraya_units u ON u.property_id=r.property_id AND u.id=r.unit_id
            JOIN saraya_documents d ON d.property_id=r.property_id AND d.id=r.id_document_id AND d.status='active'
            WHERE r.property_id=${scope.propertyId} AND r.id=${scope.requestId}
              AND (${scope.ownerId ?? null}::uuid IS NULL OR u.owner_id=${scope.ownerId ?? null})
            FOR SHARE OF r, u, d
          `)
        : await tx.execute(sql`
            SELECT r.property_id AS "propertyId", u.owner_id AS "ownerId", d.storage_key AS "storageKey",
                   d.original_name AS "originalName", d.content_type AS "contentType"
            FROM saraya_rental_requests r
            JOIN saraya_units u ON u.property_id=r.property_id AND u.id=r.unit_id
            JOIN saraya_payment_demands pd ON pd.property_id=r.property_id AND pd.rental_request_id=r.id
            JOIN saraya_payment_proofs proof ON proof.property_id=r.property_id AND proof.payment_demand_id=pd.id
              AND proof.document_id=pd.receipt_document_id
            JOIN saraya_documents d ON d.property_id=r.property_id AND d.id=proof.document_id AND d.status='active'
            WHERE r.property_id=${scope.propertyId} AND r.id=${scope.requestId}
            ORDER BY proof.created_at DESC
            LIMIT 1
            FOR SHARE OF r, u, pd, proof, d
          `);
      return (rows as unknown as RentalRequestDocumentRecord[])[0] ?? null;
    });
  },
};
