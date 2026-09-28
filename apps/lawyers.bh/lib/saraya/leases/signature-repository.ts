import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ApiError } from "../auth/contracts";
import type { ContractSnapshot } from "./contract-renderer";
import type { SignatureRepository } from "./signature-service";

const first = <T>(rows: unknown) => (rows as T[])[0];
const denied = () => new ApiError(404, "LEASE_NOT_FOUND", "العقد غير موجود", "Lease not found");
const conflict = () => new ApiError(409, "LEASE_FINALIZATION_CONFLICT", "تعذر إكمال توقيع العقد، حاول مجددًا", "Lease finalization conflicted; retry");
type PendingEvidence = {
  signerRole: "tenant" | "owner"; actorRole: "tenant" | "owner" | "authorized_admin";
  signerUserId: string; acceptedName: string; acceptedChecksum: string; evidenceDigest: string;
  ipAddress: string; userAgent: string | null; signedAt: string;
};
type LockedLease = {
  propertyId: string; leaseStatus: string; requestStatus: string; unitStatus: string;
  checksum: string; snapshot: ContractSnapshot & { generatedAt: string | Date };
  tenantUserId: string; ownerUserId: string | null; membershipRole: string | null;
  finalizationState: string; finalDocumentId: string | null; finalGeneratedAt: string | Date | null;
  finalizationStartedAt: string | Date | null;
  pendingSignature: PendingEvidence | null; requestId: string; tenantOrganizationId: string; unitId: string;
  preparedDocumentId: string | null; preparedStorageKey: string | null;
  preparedDocumentChecksum: string | null; preparedSizeBytes: number | null;
};
type LockedSignature = { role: "tenant" | "owner"; status: string; name: string | null; signedAt: string | Date | null; signerUserId: string; actorRole: string | null; evidenceDigest: string | null };

function authorized(lease: LockedLease, userId: string) {
  if (userId === lease.tenantUserId) return { signerRole: "tenant" as const, actorRole: "tenant" as const };
  if (lease.membershipRole === "owner" && lease.ownerUserId === userId) return { signerRole: "owner" as const, actorRole: "owner" as const };
  if (lease.membershipRole === "super_admin") return { signerRole: "owner" as const, actorRole: "authorized_admin" as const };
  throw denied();
}

async function lockedLease(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], leaseId: string, userId: string) {
  const rows = await tx.execute(sql`
    SELECT l.property_id AS "propertyId", l.status AS "leaseStatus", p.lease_checksum AS checksum, p.snapshot,
           p.finalization_state AS "finalizationState", p.final_document_id AS "finalDocumentId",
           p.final_generated_at AS "finalGeneratedAt", p.finalization_started_at AS "finalizationStartedAt", p.pending_signature AS "pendingSignature",
           p.prepared_document_id AS "preparedDocumentId", p.prepared_storage_key AS "preparedStorageKey",
           p.prepared_document_checksum AS "preparedDocumentChecksum", p.prepared_size_bytes AS "preparedSizeBytes",
           r.id AS "requestId", r.status AS "requestStatus", r.tenant_user_id AS "tenantUserId",
           r.tenant_organization_id AS "tenantOrganizationId", u.id AS "unitId", u.status AS "unitStatus",
           o.user_id AS "ownerUserId", m.role::text AS "membershipRole"
    FROM saraya_leases l
    JOIN saraya_lease_packages p ON p.property_id=l.property_id AND p.lease_id=l.id
    JOIN saraya_rental_requests r ON r.property_id=l.property_id AND r.lease_id=l.id
    JOIN saraya_units u ON u.property_id=l.property_id AND u.id=l.unit_id
    LEFT JOIN saraya_owners o ON o.property_id=u.property_id AND o.id=u.owner_id
    LEFT JOIN saraya_property_memberships m ON m.property_id=l.property_id AND m.user_id=${userId} AND m.is_active=true
    WHERE l.id=${leaseId}
    FOR UPDATE OF l,p,r,u
  `);
  return first<LockedLease>(rows);
}

async function lockSignatures(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], lease: LockedLease, leaseId: string) {
  return await tx.execute(sql`
    SELECT signer_role AS role, status, accepted_name AS name, signed_at AS "signedAt",
           signer_user_id AS "signerUserId", actor_role AS "actorRole", evidence_digest AS "evidenceDigest"
    FROM saraya_lease_signature_requests
    WHERE property_id=${lease.propertyId} AND lease_id=${leaseId}
    ORDER BY signer_role FOR UPDATE
  `) as unknown as LockedSignature[];
}

async function invalidateStaleOwner(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], lease: LockedLease, leaseId: string, signatures: LockedSignature[]) {
  const owner = signatures.find((item) => item.role === "owner" && item.status === "signed");
  const pendingOwner = lease.finalizationState === "preparing" && lease.pendingSignature?.signerRole === "owner" ? lease.pendingSignature : null;
  const staleSignedOwner = owner && owner.actorRole !== "authorized_admin" && (owner.actorRole !== "owner" || owner.signerUserId !== lease.ownerUserId);
  const stalePendingOwner = pendingOwner && pendingOwner.actorRole !== "authorized_admin" && (pendingOwner.actorRole !== "owner" || pendingOwner.signerUserId !== lease.ownerUserId);
  if (!staleSignedOwner && !stalePendingOwner) return { invalidated: false as const, storageKey: null };
  if (!lease.ownerUserId) throw conflict();
  const previousSignerUserId = staleSignedOwner ? owner!.signerUserId : pendingOwner!.signerUserId;
  const previousActorRole = staleSignedOwner ? owner!.actorRole : pendingOwner!.actorRole;
  const evidenceDigest = staleSignedOwner ? owner!.evidenceDigest : pendingOwner!.evidenceDigest;
  const storageKey = lease.preparedStorageKey;
  await tx.execute(sql`
    INSERT INTO saraya_lease_signature_events(property_id,lease_id,signer_role,previous_signer_user_id,previous_actor_role,evidence_digest,reason,details)
    VALUES (${lease.propertyId},${leaseId},'owner',${previousSignerUserId},${previousActorRole},${evidenceDigest},'owner_reassigned',jsonb_build_object('currentOwnerUserId',${lease.ownerUserId}::text))
  `);
  await tx.execute(sql`
    UPDATE saraya_lease_signature_requests
    SET status='pending',signer_user_id=${lease.ownerUserId},accepted_name=NULL,accepted_checksum=NULL,evidence_digest=NULL,actor_role=NULL,ip_address=NULL,user_agent=NULL,signed_at=NULL,updated_at=now()
    WHERE property_id=${lease.propertyId} AND lease_id=${leaseId} AND signer_role='owner' AND status='signed'
  `);
  await tx.execute(sql`
    UPDATE saraya_lease_packages
    SET finalization_state='pending',finalization_started_at=NULL,final_generated_at=NULL,pending_signature=NULL,
        prepared_document_id=NULL,prepared_storage_key=NULL,prepared_document_checksum=NULL,prepared_size_bytes=NULL
    WHERE property_id=${lease.propertyId} AND lease_id=${leaseId} AND finalization_state='preparing' AND final_document_id IS NULL
  `);
  lease.finalizationState = "pending";
  lease.finalizationStartedAt = null;
  lease.finalGeneratedAt = null;
  lease.pendingSignature = null;
  lease.preparedDocumentId = null;
  lease.preparedStorageKey = null;
  lease.preparedDocumentChecksum = null;
  lease.preparedSizeBytes = null;
  return { invalidated: true as const, storageKey };
}

function finalSnapshot(lease: LockedLease, existing: Array<{ role: string; name: string; signedAt: string | Date }>, pending: PendingEvidence, generatedAt: Date): ContractSnapshot {
  return {
    ...lease.snapshot,
    generatedAt,
    signatures: [
      ...existing.map((item) => ({ role: item.role, name: item.name, signedAt: item.signedAt instanceof Date ? item.signedAt.toISOString() : new Date(item.signedAt).toISOString() })),
      { role: pending.signerRole, name: pending.acceptedName, signedAt: pending.signedAt },
    ],
  };
}

export const leaseSignatureRepository: SignatureRepository = {
  async accept(input) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`lease-sign:${input.leaseId}`}, 0))`);
      const lease = await lockedLease(tx, input.leaseId, input.principal.userId);
      if (!lease || !["pending_approval", "active"].includes(lease.leaseStatus)) throw denied();
      const role = authorized(lease, input.principal.userId);
      if (lease.checksum !== input.checksum) throw new ApiError(409, "LEASE_CHECKSUM_MISMATCH", "تم تحديث نسخة العقد", "The lease version has changed");
      if (lease.leaseStatus === "active" && lease.finalDocumentId) return { kind: "active" as const, leaseId: input.leaseId, documentId: lease.finalDocumentId };

      const signatures = await lockSignatures(tx, lease, input.leaseId);
      const invalidatedOwner = await invalidateStaleOwner(tx, lease, input.leaseId, signatures);
      if (invalidatedOwner.invalidated) return { kind: "recover" as const, storageKey: invalidatedOwner.storageKey };
      const mine = signatures.find((item) => item.role === role.signerRole);
      const signed = signatures.filter((item) => item.status === "signed") as Array<{ role: string; status: string; name: string; signedAt: string | Date }>;
      if (!mine) throw denied();
      if (mine.status === "signed") {
        if (mine.name !== input.acceptedName) throw new ApiError(409, "SIGNATURE_ALREADY_RECORDED", "تم تسجيل التوقيع مسبقًا", "Signature already recorded");
        return { kind: "pending" as const, leaseId: input.leaseId, checksum: lease.checksum, actorRole: role.actorRole };
      }
      if (signed.length === 0) {
        const updated = await tx.execute(sql`UPDATE saraya_lease_signature_requests SET status='signed',signer_user_id=${input.principal.userId},accepted_name=${input.acceptedName},accepted_checksum=${input.checksum},evidence_digest=${input.evidenceDigest},actor_role=${role.actorRole},ip_address=${input.ipAddress},user_agent=${input.userAgent},signed_at=now(),updated_at=now() WHERE property_id=${lease.propertyId} AND lease_id=${input.leaseId} AND signer_role=${role.signerRole} AND status='pending' RETURNING id`);
        if (!first(updated)) throw conflict();
        return { kind: "pending" as const, leaseId: input.leaseId, checksum: lease.checksum, actorRole: role.actorRole };
      }

      if (lease.finalizationState === "preparing" && lease.pendingSignature) {
        const pending = lease.pendingSignature;
        if (pending.signerUserId !== input.principal.userId || pending.signerRole !== role.signerRole || pending.acceptedName !== input.acceptedName || pending.acceptedChecksum !== input.checksum) {
          const startedAt = lease.finalizationStartedAt ? new Date(lease.finalizationStartedAt).getTime() : Number.POSITIVE_INFINITY;
          if (Date.now() - startedAt < 15 * 60 * 1000) throw conflict();
          const staleKey = lease.preparedStorageKey;
          const reset = await tx.execute(sql`UPDATE saraya_lease_packages SET finalization_state='pending',finalization_started_at=NULL,final_generated_at=NULL,pending_signature=NULL,prepared_document_id=NULL,prepared_storage_key=NULL,prepared_document_checksum=NULL,prepared_size_bytes=NULL WHERE property_id=${lease.propertyId} AND lease_id=${input.leaseId} AND finalization_state='preparing' AND final_document_id IS NULL RETURNING lease_id`);
          if (!first(reset)) throw conflict();
          await tx.execute(sql`INSERT INTO saraya_audit_logs(property_id,actor_user_id,action,entity_type,entity_id,after) VALUES (${lease.propertyId},${input.principal.userId},'lease.finalization_recovered','lease',${input.leaseId},jsonb_build_object('previousEvidenceDigest',${pending.evidenceDigest}::text,'storageKey',${staleKey}::text))`);
          return { kind: "recover" as const, storageKey: staleKey };
        }
        const generatedAt = new Date(lease.finalGeneratedAt!);
        return { kind: "prepare" as const, leaseId: input.leaseId, propertyId: lease.propertyId, checksum: lease.checksum, evidenceDigest: pending.evidenceDigest, generatedAt, snapshot: finalSnapshot(lease, signed, pending, generatedAt) };
      }

      const generatedAt = new Date();
      const pending: PendingEvidence = { signerRole: role.signerRole, actorRole: role.actorRole, signerUserId: input.principal.userId, acceptedName: input.acceptedName, acceptedChecksum: input.checksum, evidenceDigest: input.evidenceDigest, ipAddress: input.ipAddress, userAgent: input.userAgent, signedAt: generatedAt.toISOString() };
      const prepared = await tx.execute(sql`UPDATE saraya_lease_packages SET finalization_state='preparing',finalization_started_at=${generatedAt.toISOString()},final_generated_at=${generatedAt.toISOString()},pending_signature=${JSON.stringify(pending)}::jsonb WHERE property_id=${lease.propertyId} AND lease_id=${input.leaseId} AND finalization_state='pending' AND final_document_id IS NULL RETURNING lease_id`);
      if (!first(prepared)) throw conflict();
      return { kind: "prepare" as const, leaseId: input.leaseId, propertyId: lease.propertyId, checksum: lease.checksum, evidenceDigest: input.evidenceDigest, generatedAt, snapshot: finalSnapshot(lease, signed, pending, generatedAt) };
    });
  },

  async registerPreparedDocument(input) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`lease-sign:${input.leaseId}`}, 0))`);
      await tx.execute(sql`
        UPDATE saraya_lease_packages
        SET prepared_document_id=${input.documentId},prepared_storage_key=${input.storageKey},prepared_document_checksum=${input.documentChecksum},prepared_size_bytes=${input.sizeBytes}
        WHERE lease_id=${input.leaseId} AND finalization_state='preparing' AND final_document_id IS NULL
          AND pending_signature->>'evidenceDigest'=${input.evidenceDigest} AND prepared_document_id IS NULL
      `);
      const rows = await tx.execute(sql`SELECT prepared_document_id AS "documentId",prepared_storage_key AS "storageKey",prepared_document_checksum AS checksum,prepared_size_bytes AS size FROM saraya_lease_packages WHERE lease_id=${input.leaseId} AND finalization_state='preparing' AND pending_signature->>'evidenceDigest'=${input.evidenceDigest} FOR UPDATE`);
      const prepared = first<{ documentId: string; storageKey: string; checksum: string; size: number }>(rows);
      if (!prepared || prepared.storageKey !== input.storageKey || prepared.checksum !== input.documentChecksum || prepared.size !== input.sizeBytes) throw conflict();
      return prepared.documentId;
    });
  },

  async complete(input) {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`lease-sign:${input.leaseId}`}, 0))`);
      const lease = await lockedLease(tx, input.leaseId, input.principal.userId);
      if (!lease) throw conflict();
      const role = authorized(lease, input.principal.userId);
      if (lease.leaseStatus === "active" && lease.finalDocumentId) return { status: "active", leaseId: input.leaseId, documentId: lease.finalDocumentId, preparedDocumentUsed: false };
      const signatures = await lockSignatures(tx, lease, input.leaseId);
      if ((await invalidateStaleOwner(tx, lease, input.leaseId, signatures)).invalidated) return { staleOwner: true as const };
      const pending = lease.pendingSignature;
      if (lease.leaseStatus !== "pending_approval" || lease.requestStatus !== "paid_awaiting_signature" || !["vacant", "reserved"].includes(lease.unitStatus) || lease.finalizationState !== "preparing" || lease.finalDocumentId || !pending || pending.evidenceDigest !== input.evidenceDigest || pending.signerUserId !== input.principal.userId || pending.signerRole !== role.signerRole || pending.actorRole !== role.actorRole || lease.checksum !== input.checksum || lease.preparedDocumentId !== input.documentId || lease.preparedStorageKey !== input.storageKey || lease.preparedDocumentChecksum !== input.documentChecksum || lease.preparedSizeBytes !== input.sizeBytes) throw conflict();

      const signature = await tx.execute(sql`UPDATE saraya_lease_signature_requests SET status='signed',signer_user_id=${pending.signerUserId},accepted_name=${pending.acceptedName},accepted_checksum=${pending.acceptedChecksum},evidence_digest=${pending.evidenceDigest},actor_role=${pending.actorRole},ip_address=${pending.ipAddress},user_agent=${pending.userAgent},signed_at=${pending.signedAt},updated_at=now() WHERE property_id=${lease.propertyId} AND lease_id=${input.leaseId} AND signer_role=${pending.signerRole} AND status='pending' RETURNING id`);
      if (!first(signature)) throw conflict();
      const valid = await tx.execute(sql`SELECT count(*)::int AS count FROM saraya_lease_signature_requests WHERE property_id=${lease.propertyId} AND lease_id=${input.leaseId} AND status='signed' AND accepted_checksum=${lease.checksum}`);
      if (Number(first<{ count: number }>(valid)?.count) !== 2) throw conflict();

      await tx.execute(sql`INSERT INTO saraya_documents(id,property_id,unit_id,tenant_organization_id,lease_id,uploaded_by_user_id,category,title,original_name,content_type,size_bytes,storage_key) VALUES (${input.documentId},${lease.propertyId},${lease.unitId},${lease.tenantOrganizationId},${input.leaseId},${input.principal.userId},'lease','Final signed lease','lease-v1-final.pdf','application/pdf',${input.sizeBytes},${input.storageKey}) ON CONFLICT (id) DO NOTHING`);
      const packaged = await tx.execute(sql`UPDATE saraya_lease_packages SET final_document_id=${input.documentId},final_document_checksum=${input.documentChecksum},finalized_at=now(),finalization_state='finalized',pending_signature=NULL,prepared_document_id=NULL,prepared_storage_key=NULL,prepared_document_checksum=NULL,prepared_size_bytes=NULL WHERE property_id=${lease.propertyId} AND lease_id=${input.leaseId} AND finalization_state='preparing' AND final_document_id IS NULL AND pending_signature->>'evidenceDigest'=${input.evidenceDigest} AND prepared_document_id=${input.documentId} AND prepared_storage_key=${input.storageKey} AND prepared_document_checksum=${input.documentChecksum} RETURNING lease_id`);
      const activated = await tx.execute(sql`UPDATE saraya_leases SET status='active',updated_at=now() WHERE property_id=${lease.propertyId} AND id=${input.leaseId} AND status='pending_approval' RETURNING id`);
      const completed = await tx.execute(sql`UPDATE saraya_rental_requests SET status='completed',updated_at=now() WHERE property_id=${lease.propertyId} AND id=${lease.requestId} AND status='paid_awaiting_signature' RETURNING id`);
      const occupied = await tx.execute(sql`UPDATE saraya_units SET status='occupied',updated_at=now() WHERE property_id=${lease.propertyId} AND id=${lease.unitId} AND status IN ('vacant','reserved') RETURNING id`);
      if (!first(packaged) || !first(activated) || !first(completed) || !first(occupied)) throw conflict();
      await tx.execute(sql`INSERT INTO saraya_audit_logs(property_id,actor_user_id,action,entity_type,entity_id,after) VALUES (${lease.propertyId},${input.principal.userId},'lease.activated','lease',${input.leaseId},jsonb_build_object('status','active','actorRole',${role.actorRole}::text,'documentChecksum',${input.documentChecksum}::text))`);
      return { status: "active", leaseId: input.leaseId, documentId: input.documentId, preparedDocumentUsed: true };
    });
    if ("staleOwner" in result) throw conflict();
    return result;
  },

  async resolveCompletion(input) {
    const rows = await db.execute(sql`
      SELECT p.finalization_state AS state,p.final_document_id AS "documentId",p.final_document_checksum AS checksum,
             p.prepared_storage_key AS "preparedStorageKey",p.prepared_document_checksum AS "preparedChecksum",
             d.storage_key AS "finalStorageKey"
      FROM saraya_lease_packages p
      LEFT JOIN saraya_documents d ON d.id=p.final_document_id
      WHERE p.lease_id=${input.leaseId}
    `);
    const state = first<{ state: string; documentId: string | null; checksum: string | null; preparedStorageKey: string | null; preparedChecksum: string | null; finalStorageKey: string | null }>(rows);
    if (state?.state === "finalized" && state.documentId && state.checksum === input.documentChecksum && state.finalStorageKey === input.storageKey) return { kind: "finalized", result: { status: "active", leaseId: input.leaseId, documentId: state.documentId } };
    if (state?.state === "preparing" && state.preparedStorageKey === input.storageKey && state.preparedChecksum === input.documentChecksum) return { kind: "recoverable" };
    if (!state || (state.preparedStorageKey !== input.storageKey && state.finalStorageKey !== input.storageKey)) return { kind: "unreferenced" };
    return { kind: "unknown" };
  },

  async abort(leaseId, evidenceDigest) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`lease-sign:${leaseId}`}, 0))`);
      await tx.execute(sql`UPDATE saraya_lease_packages SET finalization_state='pending',finalization_started_at=NULL,final_generated_at=NULL,pending_signature=NULL,prepared_document_id=NULL,prepared_storage_key=NULL,prepared_document_checksum=NULL,prepared_size_bytes=NULL WHERE lease_id=${leaseId} AND finalization_state='preparing' AND final_document_id IS NULL AND pending_signature->>'evidenceDigest'=${evidenceDigest}`);
    });
  },
};
