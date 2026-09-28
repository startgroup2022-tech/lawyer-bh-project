import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import { randomUUID } from "node:crypto";
import { documentKey, validateDocumentUpload, type DocumentAdapter } from "./contracts";

export interface DocumentListScope {
  propertyId: string;
  ownerId?: string;
  tenantId?: string;
}

export interface DocumentRepository {
  list(scope: DocumentListScope): Promise<unknown[]>;
  resolvePublicApplicantUnit(unitId: string): Promise<{ propertyId: string; unitId: string } | null>;
  reserveApplicantUpload(input: { actorUserId: string; unitId: string; ip: string; now: Date }): Promise<{ propertyId: string; unitId: string }>;
  findApplicantReplay?(input: { actorUserId: string; unitId: string; idempotencyKey: string; fingerprint: string }): Promise<unknown | null>;
  create(input: DocumentCreate & { id: string; propertyId: string; actorUserId: string; applicantIdempotencyKey?: string; applicantFingerprint?: string }): Promise<unknown>;
  cleanupCreated(input: { id: string; propertyId: string; actorUserId: string }): Promise<void>;
  update(input: DocumentUpdate & { propertyId: string; id: string; actorUserId: string }): Promise<unknown | null>;
}

export interface DocumentCreate {
  unitId?: string;
  title: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  category: "identity" | "commercial_registration" | "other";
  status: "active";
}

export interface DocumentUploadInput {
  title: string;
  originalName: string;
  contentType: string;
  body: Uint8Array;
}

export interface ApplicantDocumentUploadInput extends DocumentUploadInput {
  category: "identity" | "commercial_registration";
}

export interface ApplicantUploadReservation {
  propertyId: string;
  unitId: string;
  actorUserId: string;
}

export interface DocumentUpdate {
  title: string;
  category: "lease" | "identity" | "commercial_registration" | "handover" | "invoice" | "receipt" | "maintenance" | "utility" | "other";
  status: "active" | "archived";
  expiresOn?: string | null;
}

const categories = new Set(["lease", "identity", "commercial_registration", "handover", "invoice", "receipt", "maintenance", "utility", "other"]);

export function createDocumentService(
  repository: DocumentRepository,
  storage?: DocumentAdapter,
  createId: () => string = randomUUID,
) {
  async function storeDocument(input: {
    propertyId: string;
    unitId?: string;
    actorUserId: string;
    upload: DocumentUploadInput;
    category: DocumentCreate["category"];
    applicantIdempotencyKey?: string;
    applicantFingerprint?: string;
  }) {
    if (!storage) throw new ApiError(503, "DOCUMENT_STORAGE_UNAVAILABLE", "تخزين المستندات غير متاح", "Document storage is unavailable");
    const title = input.upload.title.trim();
    if (!title || title.length > 300 || !input.upload.originalName.trim()) {
      throw new ApiError(422, "VALIDATION_ERROR", "تحقق من اسم المستند والملف", "Check the document name and file");
    }
    try {
      validateDocumentUpload({
        originalName: input.upload.originalName,
        contentType: input.upload.contentType,
        size: input.upload.body.length,
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "INVALID_DOCUMENT";
      throw new ApiError(
        422,
        code,
        code === "DOCUMENT_TOO_LARGE" ? "حجم الملف يتجاوز 4 ميجابايت" : "نوع الملف أو امتداده غير مدعوم",
        code === "DOCUMENT_TOO_LARGE" ? "The file exceeds 4 MiB" : "Unsupported file type or extension",
      );
    }
    const id = createId();
    const key = documentKey(input.propertyId, input.category, id, input.upload.originalName);
    try {
      await storage.put({ key, contentType: input.upload.contentType, body: input.upload.body });
      await repository.create({
        id,
        propertyId: input.propertyId,
        ...(input.unitId ? { unitId: input.unitId } : {}),
        actorUserId: input.actorUserId,
        title,
        originalName: input.upload.originalName,
        contentType: input.upload.contentType,
        sizeBytes: input.upload.body.length,
        storageKey: key,
        category: input.category,
        status: "active",
        applicantIdempotencyKey: input.applicantIdempotencyKey,
        applicantFingerprint: input.applicantFingerprint,
      });
    } catch (error) {
      await Promise.allSettled([
        storage.delete(key),
        repository.cleanupCreated({ id, propertyId: input.propertyId, actorUserId: input.actorUserId }),
      ]);
      if (error instanceof Error && error.message === "INVALID_DOCUMENT_CONTENT") {
        throw new ApiError(422, "INVALID_DOCUMENT_CONTENT", "محتوى الملف لا يطابق نوعه", "The file content does not match its declared type");
      }
      throw error;
    }
    return {
      id,
      ...(input.unitId ? { unitId: input.unitId } : {}),
      category: input.category,
      title,
      originalName: input.upload.originalName,
      contentType: input.upload.contentType,
      sizeBytes: input.upload.body.length,
      status: "active" as const,
    };
  }

  return {
    async list(principal: SarayaPrincipal, propertyId: string) {
      const membership = principal.memberships.find((item) => item.propertyId === propertyId);
      if (!membership) {
        throw new ApiError(403, "PROPERTY_ACCESS_DENIED", "لا تملك صلاحية لهذا العقار", "Property access denied");
      }
      if (["super_admin", "property_manager", "maintenance"].includes(membership.role)) {
        return repository.list({ propertyId });
      }
      if (membership.role === "owner" && membership.ownerId) {
        return repository.list({ propertyId, ownerId: membership.ownerId });
      }
      if (membership.role === "tenant" && membership.tenantId) {
        return repository.list({ propertyId, tenantId: membership.tenantId });
      }
      throw new ApiError(403, "DOCUMENT_ACCESS_DENIED", "ليست لديك صلاحية عرض المستندات", "Document access denied");
    },
    async create(principal: SarayaPrincipal, propertyId: string, input: DocumentUploadInput) {
      const membership = principal.memberships.find((item) => item.propertyId === propertyId);
      if (!membership) throw new ApiError(403, "PROPERTY_ACCESS_DENIED", "لا تملك صلاحية لهذا العقار", "Property access denied");
      if (!["super_admin", "property_manager"].includes(membership.role)) {
        throw new ApiError(403, "DOCUMENT_CREATE_DENIED", "ليست لديك صلاحية إضافة المستندات", "Document upload access denied");
      }
      return storeDocument({ propertyId, actorUserId: principal.userId, upload: input, category: "other" });
    },
    async reserveApplicantUpload(principal: SarayaPrincipal, unitId: string, ip: string): Promise<ApplicantUploadReservation> {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(unitId)) {
        throw new ApiError(404, "PUBLIC_UNIT_NOT_FOUND", "الوحدة غير متاحة", "The unit is not available");
      }
      const unit = await repository.reserveApplicantUpload({ actorUserId: principal.userId, unitId: unitId.toLowerCase(), ip, now: new Date() });
      return { ...unit, actorUserId: principal.userId };
    },
    findApplicantReplay(principal: SarayaPrincipal, unitId: string, idempotencyKey: string, fingerprint: string) {
      return repository.findApplicantReplay?.({ actorUserId: principal.userId, unitId: unitId.toLowerCase(), idempotencyKey, fingerprint }) ?? Promise.resolve(null);
    },
    async createApplicant(principal: SarayaPrincipal, reservation: ApplicantUploadReservation, input: ApplicantDocumentUploadInput, idempotencyKey?: string, fingerprint?: string) {
      if (input.category !== "identity" && input.category !== "commercial_registration") {
        throw new ApiError(422, "INVALID_APPLICANT_DOCUMENT_CATEGORY", "فئة المستند غير صالحة", "Invalid applicant document category", { category: ["invalid"] });
      }
      if (reservation.actorUserId !== principal.userId) {
        throw new ApiError(403, "APPLICANT_DOCUMENT_ACCESS_DENIED", "لا تملك صلاحية رفع هذا المستند", "Applicant document upload denied");
      }
      try {
        return await storeDocument({
          propertyId: reservation.propertyId,
          unitId: reservation.unitId,
          actorUserId: principal.userId,
          upload: input,
          category: input.category,
          applicantIdempotencyKey: idempotencyKey,
          applicantFingerprint: fingerprint,
        });
      } catch (error) {
        if (!idempotencyKey || !fingerprint || !isApplicantIdempotencyConflict(error)) throw error;
        const winner = await repository.findApplicantReplay?.({ actorUserId: principal.userId, unitId: reservation.unitId, idempotencyKey, fingerprint });
        if (winner) return winner;
        throw error;
      }
    },
    async update(principal: SarayaPrincipal, propertyId: string, id: string, input: DocumentUpdate) {
      const membership = principal.memberships.find((item) => item.propertyId === propertyId);
      if (!membership) throw new ApiError(403, "PROPERTY_ACCESS_DENIED", "لا تملك صلاحية لهذا العقار", "Property access denied");
      if (!["super_admin", "property_manager"].includes(membership.role)) {
        throw new ApiError(403, "DOCUMENT_EDIT_DENIED", "ليست لديك صلاحية تعديل المستندات", "Document edit access denied");
      }
      const title = input.title.trim();
      if (!id.trim() || !title || title.length > 300 || !categories.has(input.category) || !["active", "archived"].includes(input.status)) {
        throw new ApiError(422, "VALIDATION_ERROR", "تحقق من بيانات المستند", "Check the document fields");
      }
      const updated = await repository.update({ ...input, title, propertyId, id, actorUserId: principal.userId });
      if (!updated) throw new ApiError(404, "DOCUMENT_NOT_FOUND", "المستند غير موجود", "Document not found");
      return updated;
    },
  };
}

function isApplicantIdempotencyConflict(error: unknown) {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth++) {
    const value = current as { code?: unknown; constraint_name?: unknown; cause?: unknown };
    if (value.code === "23505" && value.constraint_name === "saraya_documents_applicant_idempotency_uidx") return true;
    current = value.cause;
  }
  return false;
}
