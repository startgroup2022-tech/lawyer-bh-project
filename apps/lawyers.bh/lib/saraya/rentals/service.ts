import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import type { RentalDecision, RentalRequestForDecision, RentalSubmitInput, RentalUnitOffer } from "./contracts";
import { rentalSubmitResponse } from "./public-contract";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export interface RentalRepository {
  findByIdempotency(tenantUserId: string, idempotencyKey: string, input: RentalSubmitInput): Promise<unknown | null>;
  getAvailableUnit(propertyId: string, unitId: string): Promise<RentalUnitOffer | null>;
  createRequest(input: RentalSubmitInput & {
    tenantUserId: string;
    rentAmount: string;
    depositAmount: string;
    feeAmount: string;
    currency: "BHD";
    resolvedApprovalMode: "instant" | "owner_review";
  }): Promise<unknown>;
  getForDecision(propertyId: string, requestId: string): Promise<RentalRequestForDecision | null>;
  approveWithInvoice(input: {
    propertyId: string;
    requestId: string;
    actorUserId: string;
    actorRole: "owner" | "super_admin";
    actorOwnerId: string | null;
    idempotencyKey: string;
    rentAmount: string;
    depositAmount: string;
    feeAmount: string;
    totalAmount: string;
    currency: "BHD";
  }): Promise<unknown>;
  reject(input: { propertyId: string; requestId: string; actorUserId: string; actorRole: "owner" | "super_admin"; actorOwnerId: string | null; idempotencyKey: string; reason: string }): Promise<unknown>;
}

function invalid(field: string) {
  throw new ApiError(422, "INVALID_RENTAL_REQUEST", "بيانات طلب الاستئجار غير صحيحة", "Invalid rental request", { [field]: ["invalid"] });
}

function validateSubmit(input: RentalSubmitInput) {
  if (!uuidPattern.test(input.propertyId)) invalid("propertyId");
  if (!uuidPattern.test(input.unitId)) invalid("unitId");
  if (!uuidPattern.test(input.idDocumentId)) invalid("idDocumentId");
  if (input.applicantType !== "individual" && input.applicantType !== "company") invalid("applicantType");
  if (!input.applicantNameAr.trim() || input.applicantNameAr.trim().length > 255) invalid("applicantNameAr");
  if (!input.applicantNameEn.trim() || input.applicantNameEn.trim().length > 255) invalid("applicantNameEn");
  if (input.applicantType === "company" && !input.registrationNumber?.trim()) invalid("registrationNumber");
  if (input.registrationNumber && input.registrationNumber.trim().length > 160) invalid("registrationNumber");
  if (!datePattern.test(input.startDate) || Number.isNaN(Date.parse(`${input.startDate}T00:00:00Z`))) invalid("startDate");
  if (!datePattern.test(input.endDate) || Number.isNaN(Date.parse(`${input.endDate}T00:00:00Z`)) || input.endDate < input.startDate) invalid("endDate");
  if (!Number.isInteger(input.durationMonths) || input.durationMonths < 1 || input.durationMonths > 120) invalid("durationMonths");
  if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 128) invalid("idempotencyKey");
}

function toMills(value: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(value);
  if (!match) throw new ApiError(500, "INVALID_STORED_AMOUNT", "قيمة مالية غير صحيحة", "Invalid stored amount");
  return BigInt(match[1]) * BigInt(1000) + BigInt((match[2] ?? "").padEnd(3, "0"));
}

function fromMills(value: bigint): string {
  return `${value / BigInt(1000)}.${(value % BigInt(1000)).toString().padStart(3, "0")}`;
}

export function createRentalService(repository: RentalRepository) {
  return {
    async submit(principal: SarayaPrincipal, input: RentalSubmitInput) {
      validateSubmit(input);
      const idempotencyKey = input.idempotencyKey.trim();
      const normalizedInput: RentalSubmitInput = {
        ...input,
        applicantNameAr: input.applicantNameAr.trim(),
        applicantNameEn: input.applicantNameEn.trim(),
        ...(input.registrationNumber?.trim()
          ? { registrationNumber: input.registrationNumber.trim() }
          : { registrationNumber: undefined }),
        idempotencyKey,
      };
      const existing = await repository.findByIdempotency(principal.userId, idempotencyKey, normalizedInput);
      if (existing) return rentalSubmitResponse(existing, normalizedInput);
      const offer = await repository.getAvailableUnit(input.propertyId, input.unitId);
      if (!offer || !offer.isRentable || offer.status !== "vacant") {
        throw new ApiError(409, "UNIT_NOT_AVAILABLE", "المكتب أو المحل غير متاح حاليًا", "The unit is not currently available");
      }
      const created = await repository.createRequest({
        ...normalizedInput,
        tenantUserId: principal.userId,
        rentAmount: offer.rentAmount,
        depositAmount: offer.depositAmount,
        feeAmount: offer.feeAmount,
        currency: offer.currency,
        resolvedApprovalMode: offer.unitApprovalOverride ?? offer.propertyApprovalMode,
      });
      return rentalSubmitResponse(created, normalizedInput);
    },

    async decide(principal: SarayaPrincipal, propertyId: string, requestId: string, decision: RentalDecision) {
      if (!uuidPattern.test(propertyId) || !uuidPattern.test(requestId)) invalid("requestId");
      if (!decision.idempotencyKey.trim() || decision.idempotencyKey.length > 128) invalid("idempotencyKey");
      const rejectionReason = decision.type === "reject" ? decision.reason?.trim() : undefined;
      if (decision.type === "reject" && !rejectionReason) {
        throw new ApiError(422, "REJECTION_REASON_REQUIRED", "سبب الرفض مطلوب", "A rejection reason is required", { reason: ["required"] });
      }
      const membership = principal.memberships.find((item) => item.propertyId === propertyId);
      if (!membership || (membership.role !== "owner" && membership.role !== "super_admin")) {
        throw new ApiError(403, "RENTAL_DECISION_DENIED", "ليست لديك صلاحية اتخاذ القرار", "Rental decision denied");
      }
      const request = await repository.getForDecision(propertyId, requestId);
      if (!request || (membership.role === "owner" && request.ownerId !== membership.ownerId)) {
        throw new ApiError(404, "RENTAL_REQUEST_NOT_FOUND", "طلب الاستئجار غير موجود", "Rental request not found");
      }
      if (decision.type === "reject") {
        return repository.reject({
          propertyId,
          requestId,
          actorUserId: principal.userId,
          actorRole: membership.role,
          actorOwnerId: membership.ownerId ?? null,
          idempotencyKey: decision.idempotencyKey.trim(),
          reason: rejectionReason!,
        });
      }
      const totalAmount = fromMills(toMills(request.rentAmount) + toMills(request.depositAmount) + toMills(request.feeAmount));
      return repository.approveWithInvoice({
        propertyId,
        requestId,
        actorUserId: principal.userId,
        actorRole: membership.role,
        actorOwnerId: membership.ownerId ?? null,
        idempotencyKey: decision.idempotencyKey.trim(),
        rentAmount: request.rentAmount,
        depositAmount: request.depositAmount,
        feeAmount: request.feeAmount,
        totalAmount,
        currency: request.currency,
      });
    },
  };
}
