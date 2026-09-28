import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sarayaAuditLogs, sarayaDocuments } from "@/lib/db/saraya-schema";
import { ApiError } from "../auth/contracts";
import { rateLimitTimestamp } from "../auth/rate-limit-window";
import type { DocumentRepository } from "./service";

const uploadWindowMs = 60 * 60 * 1000;
const userUnitLimit = 5;
const ipUnitLimit = 20;

function uploadBucket(scope: string, value: string) {
  return `applicant-upload:${scope}:${createHash("sha256").update(value).digest("hex")}`;
}

function uploadRateLimited(): never {
  throw new ApiError(429, "APPLICANT_UPLOAD_RATE_LIMITED", "تم تجاوز حد رفع المستندات، حاول لاحقًا", "Applicant document upload limit exceeded, try again later");
}

export const documentRepository: DocumentRepository = {
  async findApplicantReplay(input) {
    const rows = await db.execute(sql`
      SELECT id, unit_id AS "unitId", category, title, original_name AS "originalName",
             content_type AS "contentType", size_bytes AS "sizeBytes", status,
             applicant_fingerprint AS fingerprint
      FROM saraya_documents
      WHERE uploaded_by_user_id=${input.actorUserId} AND unit_id=${input.unitId}
        AND applicant_idempotency_key=${input.idempotencyKey}
      LIMIT 1
    `);
    const existing = (rows as unknown as Array<Record<string, unknown> & { fingerprint: string }>)[0];
    if (!existing) return null;
    if (existing.fingerprint !== input.fingerprint) throw new ApiError(409, "IDEMPOTENCY_KEY_REUSED", "مفتاح الطلب مستخدم لملف مختلف", "The idempotency key was reused for a different file");
    const safe: Record<string, unknown> = { ...existing };
    delete safe.fingerprint;
    return safe;
  },
  async reserveApplicantUpload(input) {
    return db.transaction(async (transaction) => {
      const unitRows = await transaction.execute(sql`
        SELECT unit.property_id AS "propertyId", unit.id AS "unitId"
        FROM saraya_units unit
        JOIN saraya_properties property ON property.id=unit.property_id
        LEFT JOIN saraya_unit_types unit_type
          ON unit_type.property_id=unit.property_id AND unit_type.id=unit.unit_type_id
        WHERE unit.id=${input.unitId}
          AND property.is_active=true
          AND property.currency_code='BHD'
          AND unit.is_public_listing=true
          AND unit.is_rentable=true
          AND unit.status='vacant'
          AND COALESCE(unit.market_rent, unit_type.default_rent) IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM saraya_rental_requests active_request
            WHERE active_request.property_id=unit.property_id
              AND active_request.unit_id=unit.id
              AND active_request.status IN (
                'pending_owner_review',
                'approved_awaiting_payment',
                'paid_awaiting_signature'
              )
          )
        LIMIT 1
        FOR SHARE OF unit
      `);
      const unit = (unitRows as unknown as Array<{ propertyId: string; unitId: string }>)[0];
      if (!unit) {
        throw new ApiError(404, "PUBLIC_UNIT_NOT_FOUND", "الوحدة غير متاحة", "The unit is not available");
      }

      const cutoff = rateLimitTimestamp(new Date(input.now.getTime() - uploadWindowMs));
      const current = rateLimitTimestamp(input.now);
      const buckets = [
        { bucket: uploadBucket("user-unit", `${input.actorUserId.toLowerCase()}:${unit.unitId.toLowerCase()}`), limit: userUnitLimit },
        { bucket: uploadBucket("ip-unit", `${input.ip}:${unit.unitId.toLowerCase()}`), limit: ipUnitLimit },
      ];
      for (const item of buckets) {
        const rows = await transaction.execute(sql`
          INSERT INTO saraya_auth_rate_limits(bucket, window_started_at, count, updated_at)
          VALUES (${item.bucket}, ${current}::timestamptz, 1, ${current}::timestamptz)
          ON CONFLICT(bucket) DO UPDATE SET
            window_started_at=CASE
              WHEN saraya_auth_rate_limits.window_started_at <= ${cutoff}::timestamptz
              THEN ${current}::timestamptz
              ELSE saraya_auth_rate_limits.window_started_at
            END,
            count=CASE
              WHEN saraya_auth_rate_limits.window_started_at <= ${cutoff}::timestamptz
              THEN 1
              ELSE saraya_auth_rate_limits.count + 1
            END,
            updated_at=${current}::timestamptz
          RETURNING count
        `);
        const count = Number((rows as unknown as Array<{ count: number }>)[0]?.count ?? 1);
        if (count > item.limit) uploadRateLimited();
      }
      return unit;
    });
  },
  async resolvePublicApplicantUnit(unitId) {
    const rows = await db.execute(sql`
      SELECT unit.property_id AS "propertyId", unit.id AS "unitId"
      FROM saraya_units unit
      JOIN saraya_properties property ON property.id=unit.property_id
      LEFT JOIN saraya_unit_types unit_type
        ON unit_type.property_id=unit.property_id AND unit_type.id=unit.unit_type_id
      WHERE unit.id=${unitId}
        AND property.is_active=true
        AND property.currency_code='BHD'
        AND unit.is_public_listing=true
        AND unit.is_rentable=true
        AND unit.status='vacant'
        AND COALESCE(unit.market_rent, unit_type.default_rent) IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM saraya_rental_requests active_request
          WHERE active_request.property_id=unit.property_id
            AND active_request.unit_id=unit.id
            AND active_request.status IN (
              'pending_owner_review',
              'approved_awaiting_payment',
              'paid_awaiting_signature'
            )
        )
      LIMIT 1
    `);
    return (rows as unknown as Array<{ propertyId: string; unitId: string }>)[0] ?? null;
  },
  async list(scope) {
    const rows = await db.execute(sql`
      SELECT document.id,
             document.property_id AS "propertyId",
             document.unit_id AS "unitId",
             document.tenant_organization_id AS "tenantOrganizationId",
             document.lease_id AS "leaseId",
             document.category,
             document.title,
             document.original_name AS "originalName",
             document.content_type AS "contentType",
             document.size_bytes AS "sizeBytes",
             document.status,
             document.expires_on AS "expiresOn",
             document.created_at AS "createdAt",
             unit.unit_number AS "unitNumber",
             tenant.name_ar AS "tenantNameAr",
             tenant.name_en AS "tenantNameEn",
             uploader.display_name_ar AS "uploadedByNameAr",
             uploader.display_name_en AS "uploadedByNameEn"
      FROM saraya_documents document
      LEFT JOIN saraya_units unit ON unit.property_id=document.property_id AND unit.id=document.unit_id
      LEFT JOIN saraya_tenant_organizations tenant ON tenant.property_id=document.property_id AND tenant.id=document.tenant_organization_id
      JOIN saraya_users uploader ON uploader.id=document.uploaded_by_user_id
      WHERE document.property_id=${scope.propertyId}
        AND (${scope.ownerId ?? null}::uuid IS NULL OR unit.owner_id=${scope.ownerId ?? null})
        AND (${scope.tenantId ?? null}::uuid IS NULL OR document.tenant_organization_id=${scope.tenantId ?? null})
      ORDER BY document.created_at DESC
      LIMIT 300
    `);
    return rows as unknown[];
  },
  async create(input) {
    await db.transaction(async (tx) => {
      const [created] = await tx.insert(sarayaDocuments).values({
        id: input.id,
        propertyId: input.propertyId,
        unitId: input.unitId,
        uploadedByUserId: input.actorUserId,
        category: input.category,
        title: input.title,
        originalName: input.originalName,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        storageKey: input.storageKey,
        status: input.status,
        applicantIdempotencyKey: input.applicantIdempotencyKey,
        applicantFingerprint: input.applicantFingerprint,
      }).returning();
      await tx.insert(sarayaAuditLogs).values({
        propertyId: input.propertyId,
        actorUserId: input.actorUserId,
        action: "document.created",
        entityType: "document",
        entityId: input.id,
        after: created,
      });
    });
    return (await this.list({ propertyId: input.propertyId })).find(
      (item) => (item as { id?: string }).id === input.id,
    )!;
  },
  async cleanupCreated(input) {
    await db.delete(sarayaDocuments).where(and(
      eq(sarayaDocuments.id, input.id),
      eq(sarayaDocuments.propertyId, input.propertyId),
      eq(sarayaDocuments.uploadedByUserId, input.actorUserId),
    ));
  },
  async update(input) {
    const updated = await db.transaction(async (tx) => {
      const [before] = await tx.select().from(sarayaDocuments).where(and(
        eq(sarayaDocuments.propertyId, input.propertyId),
        eq(sarayaDocuments.id, input.id),
      )).limit(1);
      if (!before) return null;
      const [after] = await tx.update(sarayaDocuments).set({
        title: input.title,
        category: input.category,
        status: input.status,
        expiresOn: input.expiresOn,
        updatedAt: new Date(),
      }).where(and(
        eq(sarayaDocuments.propertyId, input.propertyId),
        eq(sarayaDocuments.id, input.id),
      )).returning();
      await tx.insert(sarayaAuditLogs).values({
        propertyId: input.propertyId,
        actorUserId: input.actorUserId,
        action: "document.updated",
        entityType: "document",
        entityId: input.id,
        before,
        after,
      });
      return after;
    });
    if (!updated) return null;
    return (await this.list({ propertyId: input.propertyId })).find((item) => (item as { id?: string }).id === input.id) ?? null;
  },
};
