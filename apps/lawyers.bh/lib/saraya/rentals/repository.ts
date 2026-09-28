import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ApiError } from "../auth/contracts";
import type { RentalRequestForDecision, RentalUnitOffer } from "./contracts";
import { rentalSubmissionFingerprint } from "./fingerprint";
import type { RentalRepository } from "./service";

const first = <T>(rows: unknown): T | undefined => (rows as T[])[0];
type RentalTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface ApprovalInput {
  propertyId: string;
  requestId: string;
  actorUserId: string | null;
  actorSource: "system" | "user";
  actorRole: "owner" | "super_admin" | null;
  actorOwnerId: string | null;
  idempotencyKey: string;
  rentAmount: string;
  depositAmount: string;
  feeAmount: string;
  totalAmount: string;
  currency: "BHD";
}

function authorizeLockedDecision(
  request: { ownerId: string | null },
  actor: Pick<ApprovalInput, "actorSource" | "actorRole" | "actorOwnerId">,
) {
  if (actor.actorSource === "system") return;
  if (actor.actorRole === "super_admin") return;
  if (actor.actorRole === "owner" && actor.actorOwnerId && actor.actorOwnerId === request.ownerId) return;
  throw new ApiError(404, "RENTAL_REQUEST_NOT_FOUND", "طلب الاستئجار غير موجود", "Rental request not found");
}

function alreadyDecided() {
  return new ApiError(409, "RENTAL_REQUEST_ALREADY_DECIDED", "تم اتخاذ قرار لهذا الطلب مسبقًا", "Rental request already decided");
}

function scopedDemandKey(requestId: string, idempotencyKey: string) {
  const digest = createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 32);
  return `rental:${requestId}:approve:${digest}`;
}

function sumAmounts(...amounts: string[]) {
  const mills = amounts.reduce((total, amount) => {
    const [whole, fraction = ""] = amount.split(".");
    return total + BigInt(whole) * BigInt(1000) + BigInt(fraction.padEnd(3, "0"));
  }, BigInt(0));
  return `${mills / BigInt(1000)}.${(mills % BigInt(1000)).toString().padStart(3, "0")}`;
}

async function readApprovalResult(
  executor: RentalTransaction | typeof db,
  propertyId: string,
  requestId: string,
) {
  const rows = await executor.execute(sql`
    SELECT r.id AS "requestId", r.status, r.resolved_approval_mode AS "resolvedApprovalMode",
           i.id AS "invoiceId", d.id AS "paymentDemandId", d.amount::text AS "totalAmount",
           d.currency
    FROM saraya_rental_requests r
    JOIN saraya_invoices i
      ON i.property_id=r.property_id AND i.rental_request_id=r.id
    JOIN saraya_payment_demands d
      ON d.property_id=i.property_id AND d.invoice_id=i.id
    WHERE r.property_id=${propertyId} AND r.id=${requestId}
      AND r.status='approved_awaiting_payment'
    LIMIT 1
  `);
  return first(rows) ?? null;
}

async function approveWithinTransaction(tx: RentalTransaction, input: ApprovalInput) {
  const lockedRows = await tx.execute(sql`
    SELECT r.id, r.tenant_user_id AS "tenantUserId", r.status,
           r.resolved_approval_mode AS "resolvedApprovalMode", u.owner_id AS "ownerId"
    FROM saraya_rental_requests r
    JOIN saraya_units u ON u.property_id=r.property_id AND u.id=r.unit_id
    WHERE r.property_id=${input.propertyId} AND r.id=${input.requestId}
    FOR UPDATE OF r, u
  `);
  const request = first<{
    id: string;
    tenantUserId: string;
    status: string;
    resolvedApprovalMode: "instant" | "owner_review";
    ownerId: string | null;
  }>(lockedRows);
  if (!request) throw new ApiError(404, "RENTAL_REQUEST_NOT_FOUND", "طلب الاستئجار غير موجود", "Rental request not found");
  authorizeLockedDecision(request, input);
  if (request.status === "approved_awaiting_payment") {
    const existing = await readApprovalResult(tx, input.propertyId, input.requestId);
    if (existing) return existing;
  }
  if (request.status !== "pending_owner_review") {
    throw alreadyDecided();
  }

  const invoiceRows = await tx.execute(sql`
    INSERT INTO saraya_invoices
      (property_id, rental_request_id, tenant_user_id, status, number,
       issue_date, due_date, subtotal_amount, total_amount, currency)
    VALUES
      (${input.propertyId}, ${input.requestId}, ${request.tenantUserId}, 'due',
       ${`SAR-${new Date().getUTCFullYear()}-${input.requestId.slice(0, 8).toUpperCase()}`},
       CURRENT_DATE, CURRENT_DATE, ${input.totalAmount}, ${input.totalAmount}, ${input.currency})
    RETURNING id
  `);
  const invoice = first<{ id: string }>(invoiceRows)!;
  const items = [
    ["rent", "الإيجار", "Rent", input.rentAmount],
    ["deposit", "التأمين", "Deposit", input.depositAmount],
    ["fee", "الرسوم", "Fees", input.feeAmount],
  ].filter((item) => item[3] !== "0.000");
  for (const [kind, descriptionAr, descriptionEn, amount] of items) {
    await tx.execute(sql`
      INSERT INTO saraya_invoice_items
        (property_id, invoice_id, kind, description_ar, description_en, unit_amount, amount)
      VALUES (${input.propertyId}, ${invoice.id}, ${kind}, ${descriptionAr}, ${descriptionEn}, ${amount}, ${amount})
    `);
  }
  const demandRows = await tx.execute(sql`
    INSERT INTO saraya_payment_demands
      (property_id, invoice_id, rental_request_id, status, amount, currency, idempotency_key)
    VALUES
      (${input.propertyId}, ${invoice.id}, ${input.requestId}, 'pending',
       ${input.totalAmount}, ${input.currency}, ${scopedDemandKey(input.requestId, input.idempotencyKey)})
    RETURNING id
  `);
  const demand = first<{ id: string }>(demandRows)!;
  await tx.execute(sql`
    UPDATE saraya_rental_requests
    SET status='approved_awaiting_payment', decided_by_user_id=${input.actorUserId},
        decided_at=now(), updated_at=now()
    WHERE property_id=${input.propertyId} AND id=${input.requestId}
  `);
  await tx.execute(sql`
    INSERT INTO saraya_audit_logs
      (property_id, actor_user_id, action, entity_type, entity_id, after)
    VALUES
      (${input.propertyId}, ${input.actorUserId}, 'rental_request.approved', 'rental_request', ${input.requestId},
       jsonb_build_object('status', 'approved_awaiting_payment', 'actorSource', ${input.actorSource}::text,
                          'invoiceId', ${invoice.id}::text, 'paymentDemandId', ${demand.id}::text))
  `);
  return {
    requestId: input.requestId,
    status: "approved_awaiting_payment" as const,
    resolvedApprovalMode: request.resolvedApprovalMode,
    invoiceId: invoice.id,
    paymentDemandId: demand.id,
    totalAmount: input.totalAmount,
    currency: input.currency,
  };
}

function unavailable() {
  return new ApiError(409, "UNIT_NOT_AVAILABLE", "المكتب أو المحل غير متاح حاليًا", "The unit is not currently available");
}

export const rentalRepository: RentalRepository = {
  async findByIdempotency(tenantUserId, idempotencyKey, input) {
    const rows = await db.execute(sql`
      SELECT id, property_id AS "propertyId", unit_id AS "unitId",
             tenant_user_id AS "tenantUserId", status, start_date::text AS "startDate",
             end_date::text AS "endDate", duration_months AS "durationMonths",
             id_document_id AS "idDocumentId", applicant_type AS "applicantType",
             applicant_name_ar AS "applicantNameAr", applicant_name_en AS "applicantNameEn",
             registration_number AS "registrationNumber",
             rent_amount::text AS "rentAmount", deposit_amount::text AS "depositAmount",
             fee_amount::text AS "feeAmount", currency,
             resolved_approval_mode AS "resolvedApprovalMode"
      FROM saraya_rental_requests
      WHERE tenant_user_id=${tenantUserId} AND idempotency_key=${idempotencyKey}
      LIMIT 1
    `);
    const request = first<{
      id: string;
      propertyId: string;
      unitId: string;
      status: string;
      startDate: string;
      endDate: string;
      durationMonths: number;
      idDocumentId: string;
      applicantType: "individual" | "company";
      applicantNameAr: string;
      applicantNameEn: string;
      registrationNumber: string | null;
    }>(rows);
    if (!request) return null;
    if (rentalSubmissionFingerprint(request) !== rentalSubmissionFingerprint(input)) {
      throw new ApiError(409, "IDEMPOTENCY_KEY_REUSED", "مفتاح الطلب مستخدم لبيانات مختلفة", "The idempotency key was reused with different data");
    }
    if (request.status === "approved_awaiting_payment") {
      return await readApprovalResult(db, request.propertyId, request.id) ?? request;
    }
    return request;
  },

  async getAvailableUnit(propertyId, unitId) {
    const rows = await db.execute(sql`
      SELECT u.id, u.property_id AS "propertyId", u.owner_id AS "ownerId",
             COALESCE(u.market_rent, t.default_rent)::text AS "rentAmount",
             '0.000'::text AS "depositAmount", '0.000'::text AS "feeAmount",
             'BHD'::text AS currency, u.is_rentable AS "isRentable", u.status,
             p.rental_approval_mode AS "propertyApprovalMode",
             u.rental_approval_override AS "unitApprovalOverride"
      FROM saraya_units u
      JOIN saraya_properties p ON p.id=u.property_id
      LEFT JOIN saraya_unit_types t ON t.property_id=u.property_id AND t.id=u.unit_type_id
      WHERE u.property_id=${propertyId} AND u.id=${unitId}
        AND p.is_active=true AND u.is_public_listing=true AND u.is_rentable=true AND u.status='vacant'
        AND p.currency_code='BHD' AND COALESCE(u.market_rent, t.default_rent) IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM saraya_rental_requests active_request
          WHERE active_request.property_id=u.property_id AND active_request.unit_id=u.id
            AND active_request.status IN ('pending_owner_review', 'approved_awaiting_payment', 'paid_awaiting_signature')
        )
      LIMIT 1
    `);
    return first<RentalUnitOffer>(rows) ?? null;
  },

  async createRequest(input) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.tenantUserId}:${input.idempotencyKey}`}, 0))`);
      const existingRows = await tx.execute(sql`
        SELECT id, property_id AS "propertyId", unit_id AS "unitId", status,
               start_date::text AS "startDate", end_date::text AS "endDate",
               duration_months AS "durationMonths", id_document_id AS "idDocumentId",
               applicant_type AS "applicantType", applicant_name_ar AS "applicantNameAr",
               applicant_name_en AS "applicantNameEn", registration_number AS "registrationNumber",
               resolved_approval_mode AS "resolvedApprovalMode"
        FROM saraya_rental_requests
        WHERE tenant_user_id=${input.tenantUserId} AND idempotency_key=${input.idempotencyKey}
        FOR UPDATE
      `);
      const existing = first<{
        id: string;
        propertyId: string;
        unitId: string;
        status: string;
        startDate: string;
        endDate: string;
        durationMonths: number;
        idDocumentId: string;
        applicantType: "individual" | "company";
        applicantNameAr: string;
        applicantNameEn: string;
        registrationNumber: string | null;
        resolvedApprovalMode: string;
      }>(existingRows);
      if (existing) {
        if (rentalSubmissionFingerprint(existing) !== rentalSubmissionFingerprint(input)) {
          throw new ApiError(409, "IDEMPOTENCY_KEY_REUSED", "مفتاح الطلب مستخدم لبيانات مختلفة", "The idempotency key was reused with different data");
        }
        if (existing.status === "approved_awaiting_payment") {
          return await readApprovalResult(tx, input.propertyId, existing.id) ?? existing;
        }
        return existing;
      }

      const offerRows = await tx.execute(sql`
        SELECT u.id, u.property_id AS "propertyId", COALESCE(u.market_rent, t.default_rent)::text AS "rentAmount",
               '0.000'::text AS "depositAmount", '0.000'::text AS "feeAmount", 'BHD'::text AS currency,
               COALESCE(u.rental_approval_override, p.rental_approval_mode) AS "resolvedApprovalMode"
        FROM saraya_units u
        JOIN saraya_properties p ON p.id=u.property_id
        LEFT JOIN saraya_unit_types t ON t.property_id=u.property_id AND t.id=u.unit_type_id
        WHERE u.property_id=${input.propertyId} AND u.id=${input.unitId}
          AND p.is_active=true AND p.currency_code='BHD'
          AND u.is_public_listing=true AND u.is_rentable=true AND u.status='vacant'
          AND COALESCE(u.market_rent, t.default_rent) IS NOT NULL
        FOR UPDATE OF u
      `);
      const offer = first<{
        id: string;
        propertyId: string;
        rentAmount: string;
        depositAmount: string;
        feeAmount: string;
        currency: "BHD";
        resolvedApprovalMode: "instant" | "owner_review";
      }>(offerRows);
      if (!offer) throw unavailable();

      const documentRows = await tx.execute(sql`
        SELECT id
        FROM saraya_documents
        WHERE property_id=${input.propertyId} AND id=${input.idDocumentId}
          AND unit_id=${input.unitId} AND uploaded_by_user_id=${input.tenantUserId} AND status='active'
          AND category=${input.applicantType === "company" ? "commercial_registration" : "identity"}
        LIMIT 1
      `);
      if (!first(documentRows)) {
        throw new ApiError(422, "INVALID_ID_DOCUMENT", "مستند الهوية غير صالح لهذا الطلب", "The identity document is not valid for this application", { idDocumentId: ["invalid"] });
      }

      const activeRows = await tx.execute(sql`
        SELECT id
        FROM saraya_rental_requests
        WHERE property_id=${input.propertyId} AND unit_id=${input.unitId}
          AND status IN ('pending_owner_review', 'approved_awaiting_payment', 'paid_awaiting_signature')
        LIMIT 1
      `);
      if (first(activeRows)) throw unavailable();

      const requestRows = await tx.execute(sql`
        INSERT INTO saraya_rental_requests
          (property_id, unit_id, tenant_user_id, status, start_date, end_date,
           duration_months, rent_amount, deposit_amount, fee_amount, currency,
           id_document_id, idempotency_key, resolved_approval_mode, applicant_type,
           applicant_name_ar, applicant_name_en, registration_number)
        VALUES
          (${input.propertyId}, ${input.unitId}, ${input.tenantUserId}, 'pending_owner_review',
           ${input.startDate}, ${input.endDate}, ${input.durationMonths}, ${offer.rentAmount},
           ${offer.depositAmount}, ${offer.feeAmount}, ${offer.currency}, ${input.idDocumentId},
           ${input.idempotencyKey}, ${offer.resolvedApprovalMode}, ${input.applicantType},
           ${input.applicantNameAr}, ${input.applicantNameEn}, ${input.registrationNumber ?? null})
        RETURNING id, property_id AS "propertyId", unit_id AS "unitId",
                  tenant_user_id AS "tenantUserId", status,
                  rent_amount::text AS "rentAmount", deposit_amount::text AS "depositAmount",
                  fee_amount::text AS "feeAmount", currency,
                  resolved_approval_mode AS "resolvedApprovalMode"
      `);
      const request = first<{
        id: string;
        propertyId: string;
        unitId: string;
        tenantUserId: string;
        status: "pending_owner_review";
        rentAmount: string;
        depositAmount: string;
        feeAmount: string;
        currency: "BHD";
        resolvedApprovalMode: "instant" | "owner_review";
      }>(requestRows)!;
      await tx.execute(sql`
        INSERT INTO saraya_audit_logs
          (property_id, actor_user_id, action, entity_type, entity_id, after)
        VALUES
          (${input.propertyId}, ${input.tenantUserId}, 'rental_request.submitted', 'rental_request', ${request.id},
           jsonb_build_object('status', 'pending_owner_review', 'actorSource', 'public',
                              'resolvedApprovalMode', ${offer.resolvedApprovalMode}::text))
      `);
      if (offer.resolvedApprovalMode === "owner_review") return request;

      const totalAmount = sumAmounts(offer.rentAmount, offer.depositAmount, offer.feeAmount);
      return approveWithinTransaction(tx, {
        propertyId: input.propertyId,
        requestId: request.id,
        actorUserId: null,
        actorSource: "system",
        actorRole: null,
        actorOwnerId: null,
        idempotencyKey: input.idempotencyKey,
        rentAmount: offer.rentAmount,
        depositAmount: offer.depositAmount,
        feeAmount: offer.feeAmount,
        totalAmount,
        currency: offer.currency,
      });
    });
  },

  async getForDecision(propertyId, requestId) {
    const rows = await db.execute(sql`
      SELECT r.id, r.property_id AS "propertyId", r.unit_id AS "unitId",
             r.tenant_user_id AS "tenantUserId", u.owner_id AS "ownerId", r.status,
             r.rent_amount::text AS "rentAmount", r.deposit_amount::text AS "depositAmount",
             r.fee_amount::text AS "feeAmount", r.currency,
             r.decision_reason AS "decisionReason"
      FROM saraya_rental_requests r
      JOIN saraya_units u ON u.property_id=r.property_id AND u.id=r.unit_id
      WHERE r.property_id=${propertyId} AND r.id=${requestId}
      LIMIT 1
    `);
    return first<RentalRequestForDecision>(rows) ?? null;
  },

  async approveWithInvoice(input) {
    return db.transaction((tx) => approveWithinTransaction(tx, {
      ...input,
      actorSource: "user",
    }));
  },

  async reject(input) {
    return db.transaction(async (tx) => {
      const lockedRows = await tx.execute(sql`
        SELECT r.status, r.decision_reason AS reason, u.owner_id AS "ownerId"
        FROM saraya_rental_requests r
        JOIN saraya_units u ON u.property_id=r.property_id AND u.id=r.unit_id
        WHERE r.property_id=${input.propertyId} AND r.id=${input.requestId}
        FOR UPDATE OF r, u
      `);
      const request = first<{ status: string; reason: string | null; ownerId: string | null }>(lockedRows);
      if (!request) throw new ApiError(404, "RENTAL_REQUEST_NOT_FOUND", "طلب الاستئجار غير موجود", "Rental request not found");
      authorizeLockedDecision(request, { actorSource: "user", actorRole: input.actorRole, actorOwnerId: input.actorOwnerId });
      if (request.status === "rejected") {
        return { requestId: input.requestId, status: "rejected" as const, reason: request.reason };
      }
      if (request.status !== "pending_owner_review") throw alreadyDecided();
      const rows = await tx.execute(sql`
        UPDATE saraya_rental_requests
        SET status='rejected', decision_reason=${input.reason}, decided_by_user_id=${input.actorUserId},
            decided_at=now(), updated_at=now()
        WHERE property_id=${input.propertyId} AND id=${input.requestId}
        RETURNING id AS "requestId", status, decision_reason AS reason
      `);
      const result = first(rows)!;
      await tx.execute(sql`
        INSERT INTO saraya_audit_logs
          (property_id, actor_user_id, action, entity_type, entity_id, after)
        VALUES
          (${input.propertyId}, ${input.actorUserId}, 'rental_request.rejected', 'rental_request', ${input.requestId},
           jsonb_build_object('status', 'rejected', 'actorSource', 'user', 'reason', ${input.reason}::text))
      `);
      return result;
    });
  },
};
