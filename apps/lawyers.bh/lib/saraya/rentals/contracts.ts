export type RentalRequestStatus =
  | "pending_owner_review"
  | "approved_awaiting_payment"
  | "rejected"
  | "paid_awaiting_signature"
  | "completed"
  | "cancelled";

export interface RentalSubmitInput {
  propertyId: string;
  unitId: string;
  applicantType: "individual" | "company";
  applicantNameAr: string;
  applicantNameEn: string;
  registrationNumber?: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  idDocumentId: string;
  idempotencyKey: string;
}

export type RentalDecision =
  | { type: "approve"; idempotencyKey: string }
  | { type: "reject"; idempotencyKey: string; reason?: string };

export interface RentalUnitOffer {
  id: string;
  propertyId: string;
  ownerId: string | null;
  rentAmount: string;
  depositAmount: string;
  feeAmount: string;
  currency: "BHD";
  isRentable: boolean;
  status: string;
  propertyApprovalMode: "instant" | "owner_review";
  unitApprovalOverride: "instant" | "owner_review" | null;
}

export interface RentalRequestForDecision {
  id: string;
  propertyId: string;
  unitId: string;
  tenantUserId: string;
  ownerId: string | null;
  status: RentalRequestStatus;
  rentAmount: string;
  depositAmount: string;
  feeAmount: string;
  currency: "BHD";
  decisionReason?: string | null;
}
