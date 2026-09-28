import { ApiError, type SarayaPrincipal } from "../auth/contracts";

export type RentalRequestDocumentKind = "identity" | "payment-proof";
export interface RentalRequestQueueCursor { priority: number; sortAt: string; id: string }
export interface RentalRequestListScope {
  propertyId: string;
  ownerId?: string;
  cursor?: RentalRequestQueueCursor;
  limit: number;
}
export interface RentalRequestQueueRow {
  id: string;
  unitNumber: string;
  applicantDisplayName: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  depositAmount: string;
  feeAmount: string;
  currency: string;
  resolvedApprovalMode: "instant" | "owner_review";
  status: string;
  paymentState: string | null;
  demandId: string | null;
  identityDocumentPresent: boolean;
  paymentProofPresent: boolean;
  timeline: Array<{ event: string; occurredAt: string }>;
  sortPriority: number;
  sortAt: string;
}
export interface RentalRequestDocumentRecord { propertyId: string; ownerId: string | null; storageKey: string; originalName: string; contentType: string }
export interface RentalRequestListRepository {
  list(scope: RentalRequestListScope): Promise<RentalRequestQueueRow[]>;
  findDocument(input: { propertyId: string; requestId: string; kind: RentalRequestDocumentKind; ownerId?: string }): Promise<RentalRequestDocumentRecord | null>;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalid = (code: string) => new ApiError(422, code, "بيانات الطلب غير صالحة", "Invalid request data");

function membershipFor(principal: SarayaPrincipal, propertyId: string) {
  return principal.memberships.find((item) => item.propertyId === propertyId);
}

function encodeCursor(cursor: RentalRequestQueueCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(value: string): RentalRequestQueueCursor {
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString()) as RentalRequestQueueCursor;
    if (!Number.isInteger(cursor.priority) || cursor.priority < 0 || cursor.priority > 2 || !uuid.test(cursor.id) || Number.isNaN(Date.parse(cursor.sortAt))) throw new Error();
    return cursor;
  } catch {
    throw invalid("INVALID_CURSOR");
  }
}

export function createRentalRequestListService(repository: RentalRequestListRepository) {
  return {
    async list(principal: SarayaPrincipal, propertyId: string, input: { cursor?: string; limit?: number } = {}) {
      const membership = membershipFor(principal, propertyId);
      if (!membership || !["owner", "super_admin", "property_manager", "accountant"].includes(membership.role)) {
        throw new ApiError(403, "RENTAL_REQUEST_ACCESS_DENIED", "ليست لديك صلاحية عرض طلبات الاستئجار", "Rental request access denied");
      }
      if (membership.role === "owner" && !membership.ownerId) {
        throw new ApiError(403, "OWNER_SCOPE_REQUIRED", "حساب المالك غير مرتبط بمالك العقار", "Owner account is not linked to a property owner");
      }
      const limit = input.limit ?? 25;
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw invalid("INVALID_LIMIT");
      const rows = await repository.list({
        propertyId,
        limit: limit + 1,
        ...(input.cursor ? { cursor: decodeCursor(input.cursor) } : {}),
        ...(membership.role === "owner" ? { ownerId: membership.ownerId! } : {}),
      });
      const page = rows.slice(0, limit);
      const items = page.map((item) => ({
        id: item.id,
        unitNumber: item.unitNumber,
        applicantDisplayName: item.applicantDisplayName,
        startDate: item.startDate,
        endDate: item.endDate,
        rentAmount: item.rentAmount,
        depositAmount: item.depositAmount,
        feeAmount: item.feeAmount,
        currency: item.currency,
        resolvedApprovalMode: item.resolvedApprovalMode,
        status: item.status,
        paymentState: item.paymentState,
        demandId: item.demandId,
        identityDocumentPresent: item.identityDocumentPresent,
        paymentProofPresent: item.paymentProofPresent,
        timeline: [...item.timeline].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt)),
        canApprove: item.status === "pending_owner_review" && (membership.role === "owner" || membership.role === "super_admin"),
        canVerifyOfflinePayment: item.paymentState === "verification_pending" && ["accountant", "property_manager", "super_admin"].includes(membership.role),
        canDownloadIdentityDocument: item.identityDocumentPresent && ["owner", "property_manager", "super_admin"].includes(membership.role),
        canDownloadPaymentProof: item.paymentProofPresent && ["accountant", "property_manager", "super_admin"].includes(membership.role),
      }));
      const last = page.at(-1);
      return {
        items,
        nextCursor: rows.length > limit && last ? encodeCursor({ priority: last.sortPriority, sortAt: last.sortAt, id: last.id }) : null,
      };
    },
    async document(principal: SarayaPrincipal, propertyId: string, requestId: string, kind: RentalRequestDocumentKind) {
      const membership = membershipFor(principal, propertyId);
      if (!membership) throw new ApiError(403, "RENTAL_DOCUMENT_ACCESS_DENIED", "ليست لديك صلاحية عرض المستند", "Rental document access denied");
      if (membership.role === "owner" && !membership.ownerId) {
        throw new ApiError(403, "OWNER_SCOPE_REQUIRED", "حساب المالك غير مرتبط بمالك العقار", "Owner account is not linked to a property owner");
      }
      const identityAllowed = kind === "identity" && ["owner", "property_manager", "super_admin"].includes(membership.role);
      const proofAllowed = kind === "payment-proof" && ["accountant", "property_manager", "super_admin"].includes(membership.role);
      if (!identityAllowed && !proofAllowed) {
        throw new ApiError(403, "RENTAL_DOCUMENT_ACCESS_DENIED", "ليست لديك صلاحية عرض المستند", "Rental document access denied");
      }
      const record = await repository.findDocument({ propertyId, requestId, kind, ...(membership.role === "owner" ? { ownerId: membership.ownerId! } : {}) });
      if (!record) throw new ApiError(404, "RENTAL_DOCUMENT_NOT_FOUND", "مستند الطلب غير موجود", "Rental request document not found");
      return record;
    },
  };
}
