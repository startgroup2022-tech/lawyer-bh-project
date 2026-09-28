export type LeaseStatus = "draft" | "pending_approval" | "active" | "renewal_requested" | "rejected" | "terminated" | "closed";
export type RentFrequency = "monthly" | "quarterly" | "annual";

export interface LeaseTerms {
  startDate: string;
  endDate: string;
  rentAmount: string;
  depositAmount: string;
  frequency: RentFrequency;
  dueDay: number;
  graceDays: number;
  discountAmount: string;
  feeAmount: string;
}

export interface LeaseVersion {
  version: number;
  terms: LeaseTerms;
  createdAt: Date;
  createdByUserId: string;
}

export type LeaseCommand =
  | { type: "submit" | "approve" | "reject" | "request_renewal" | "reject_renewal" | "terminate" | "close"; reason?: string }
  | { type: "approve_renewal"; terms: LeaseTerms };

export interface RentScheduleItem {
  sequence: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  graceUntil: string;
  baseMinor: string;
  discountMinor: string;
  feeMinor: string;
  totalMinor: string;
}

export class LeaseError extends Error {
  readonly status: number;
  constructor(public readonly code: string, status = 422) {
    super(code);
    this.name = "LeaseError";
    this.status = status;
  }
}
