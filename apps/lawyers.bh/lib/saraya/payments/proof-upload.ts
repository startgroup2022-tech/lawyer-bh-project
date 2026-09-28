import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documentKey, maxDocumentBytes, validateDocumentUpload, type DocumentAdapter } from "../documents/contracts";
import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import type { PaymentRepository } from "./service";

const maxMultipartBytes = maxDocumentBytes + 64 * 1024;

async function boundedBytes(stream: ReadableStream<Uint8Array>, limit: number) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel().catch(() => undefined);
        throw new ApiError(413, "DOCUMENT_BODY_TOO_LARGE", "حجم طلب المستند كبير جدًا", "The document request body is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
  return output;
}

async function paymentProofForm(request: Request) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxMultipartBytes) {
    throw new ApiError(413, "DOCUMENT_BODY_TOO_LARGE", "حجم طلب المستند كبير جدًا", "The document request body is too large");
  }
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("multipart/form-data") || !request.body) {
    throw new ApiError(415, "MULTIPART_REQUIRED", "يجب إرسال نموذج مستند", "A multipart document form is required");
  }
  const bytes = await boundedBytes(request.body, maxMultipartBytes);
  const form = await new Response(bytes, { headers: { "content-type": contentType } }).formData();
  const file = form.get("file");
  const reference = form.get("reference");
  const title = form.get("title");
  if (!(file instanceof File) || file.size < 1 || typeof reference !== "string" || !reference.trim()) {
    throw new ApiError(422, "PAYMENT_PROOF_REQUIRED", "ملف الإثبات والمرجع مطلوبان", "Payment proof file and reference are required");
  }
  const body = await boundedBytes(file.stream(), maxDocumentBytes);
  try {
    validateDocumentUpload({ originalName: file.name, contentType: file.type, size: body.length });
  } catch {
    throw new ApiError(422, "INVALID_PAYMENT_PROOF", "نوع أو حجم إثبات الدفع غير صالح", "Invalid payment proof type or size");
  }
  return { file, body, reference: reference.trim().slice(0, 160), title: typeof title === "string" && title.trim() ? title.trim().slice(0, 300) : "Payment receipt" };
}

function bucket(userId: string, demandId: string) {
  return `payment-proof:${createHash("sha256").update(`${userId}:${demandId}`).digest("hex")}`;
}

export function createPaymentProofUploader(repository: PaymentRepository, storage: DocumentAdapter) {
  return async (request: Request, principal: SarayaPrincipal, demandId: string, idempotencyKey: string) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(demandId)) {
      throw new ApiError(404, "PAYMENT_NOT_FOUND", "عملية الدفع غير موجودة", "Payment not found");
    }
    demandId = demandId.toLowerCase();
    idempotencyKey = idempotencyKey.trim();
    if (!idempotencyKey || idempotencyKey.length > 128) throw new ApiError(422, "INVALID_IDEMPOTENCY_KEY", "مفتاح الطلب غير صالح", "Invalid idempotency key");
    const upload = await paymentProofForm(request);
    const fingerprint = createHash("sha256").update(JSON.stringify({
      demandId,
      reference: upload.reference,
      title: upload.title,
      originalName: upload.file.name,
      contentType: upload.file.type,
      bodyHash: createHash("sha256").update(upload.body).digest("hex"),
    })).digest("hex");
    const existing = await repository.findOperation({ actorUserId: principal.userId, action: "offline_proof.submit", idempotencyKey, fingerprint });
    if (existing) return existing;
    const quotaBucket = bucket(principal.userId, demandId);
    const context = await db.transaction(async (tx) => {
      const rows = await tx.execute(sql`
        SELECT d.property_id AS "propertyId", r.unit_id AS "unitId"
        FROM saraya_payment_demands d
        JOIN saraya_rental_requests r ON r.property_id=d.property_id AND r.id=d.rental_request_id
        WHERE d.id=${demandId} AND r.tenant_user_id=${principal.userId}
          AND d.status IN ('pending','failed','verification_pending')
        FOR SHARE OF d, r
      `);
      const value = (rows as unknown as Array<{ propertyId: string; unitId: string }>)[0];
      if (!value) throw new ApiError(404, "PAYMENT_NOT_FOUND", "عملية الدفع غير موجودة", "Payment not found");
      const limits = await tx.execute(sql`
        INSERT INTO saraya_auth_rate_limits(bucket, window_started_at, count, updated_at)
        VALUES (${quotaBucket}, now(), 1, now())
        ON CONFLICT(bucket) DO UPDATE SET
          window_started_at=CASE WHEN saraya_auth_rate_limits.window_started_at < now() - interval '1 hour' THEN now() ELSE saraya_auth_rate_limits.window_started_at END,
          count=CASE WHEN saraya_auth_rate_limits.window_started_at < now() - interval '1 hour' THEN 1 ELSE saraya_auth_rate_limits.count + 1 END,
          updated_at=now()
        RETURNING count
      `);
      if (Number((limits as unknown as Array<{ count: number }>)[0]?.count) > 5) {
        throw new ApiError(429, "PAYMENT_PROOF_RATE_LIMITED", "تم تجاوز حد رفع الإثباتات", "Payment proof upload limit exceeded");
      }
      return value;
    });
    let quotaConsumed = true;
    const releaseQuota = async () => {
      if (!quotaConsumed) return;
      quotaConsumed = false;
      await db.execute(sql`
        UPDATE saraya_auth_rate_limits SET count=GREATEST(count - 1, 0), updated_at=now()
        WHERE bucket=${quotaBucket}
      `);
    };
    const documentId = randomUUID();
    const key = documentKey(context.propertyId, "receipt", documentId, upload.file.name);
    try {
      await storage.put({ key, contentType: upload.file.type, body: upload.body });
      await db.execute(sql`
        INSERT INTO saraya_documents(id, property_id, unit_id, uploaded_by_user_id, category, title,
          original_name, content_type, size_bytes, storage_key, status)
        VALUES (${documentId}, ${context.propertyId}, ${context.unitId}, ${principal.userId}, 'receipt', ${upload.title},
          ${upload.file.name}, ${upload.file.type}, ${upload.body.length}, ${key}, 'active')
      `);
      const result = await repository.submitOfflineProof({ tenantUserId: principal.userId, demandId, documentId, reference: upload.reference, idempotencyKey, fingerprint });
      if ((result as { documentId?: string }).documentId !== documentId) {
        await Promise.allSettled([
          storage.delete(key),
          db.execute(sql`DELETE FROM saraya_documents WHERE id=${documentId} AND uploaded_by_user_id=${principal.userId}`),
          releaseQuota(),
        ]);
      }
      return result;
    } catch (error) {
      await Promise.allSettled([
        storage.delete(key),
        db.execute(sql`DELETE FROM saraya_documents WHERE id=${documentId} AND uploaded_by_user_id=${principal.userId}`),
        releaseQuota(),
      ]);
      if (error instanceof Error && error.message === "INVALID_DOCUMENT_CONTENT") {
        throw new ApiError(422, "INVALID_PAYMENT_PROOF_CONTENT", "محتوى إثبات الدفع غير صالح", "Invalid payment proof content");
      }
      throw error;
    }
  };
}
