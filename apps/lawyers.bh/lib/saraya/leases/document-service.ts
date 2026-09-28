import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { SarayaPrincipal } from "../auth/contracts";
import { readDocumentBytes } from "../documents/storage";
import { createLeaseDocumentDownload } from "./document-download";

const download = createLeaseDocumentDownload({
  async find(leaseId, final) {
    const rows = await db.execute(sql`
    SELECT l.property_id AS "propertyId", r.tenant_user_id AS "tenantUserId", u.owner_id AS "ownerId",
           CASE WHEN ${final} THEN fp.storage_key ELSE dp.storage_key END AS "storageKey",
           CASE WHEN ${final} THEN fp.original_name ELSE dp.original_name END AS "originalName"
    FROM saraya_leases l JOIN saraya_rental_requests r ON r.lease_id=l.id
    JOIN saraya_units u ON u.property_id=l.property_id AND u.id=l.unit_id
    JOIN saraya_lease_packages p ON p.lease_id=l.id
    JOIN saraya_documents dp ON dp.id=p.draft_document_id
    LEFT JOIN saraya_documents fp ON fp.id=p.final_document_id
    WHERE l.id=${leaseId}
  `);
    const lease = (rows as unknown as Array<{ propertyId: string; tenantUserId: string; ownerId: string | null; storageKey: string | null; originalName: string | null }>)[0];
    return lease?.storageKey && lease.originalName ? { ...lease, storageKey: lease.storageKey, originalName: lease.originalName } : null;
  },
  read: readDocumentBytes,
});

export function leaseDocument(principal: SarayaPrincipal, leaseId: string, final: boolean) {
  return download(principal, leaseId, final);
}
