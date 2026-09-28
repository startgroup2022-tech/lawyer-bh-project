export type ManualAssignmentCase = {
  paymentStatus: string;
  tapStatus: string | null;
  serviceStatus: string;
  adminEscalatedAt: Date | null;
  assignedLawyerId: string | null;
  candidateLawyerId: string | null;
  countryCode: string;
  excludedLawyerIds: string[];
};

export type ManualAssignmentLawyer = {
  id: string;
  countryCode: string;
  isActive: boolean;
  status: string;
  isReviewAccount: boolean;
  suspensionType: string | null;
  isEmergencyReady: boolean;
  isBusy: boolean;
  isAccountClosed: boolean;
};

export function canManuallyAssign(
  request: ManualAssignmentCase,
  lawyer: ManualAssignmentLawyer,
): "eligible" | "request_unavailable" | "lawyer_unavailable" {
  if (request.paymentStatus !== "success" || request.tapStatus !== "CAPTURED" ||
      request.serviceStatus !== "pending" || !request.adminEscalatedAt ||
      request.assignedLawyerId || request.candidateLawyerId) {
    return "request_unavailable";
  }
  if (lawyer.countryCode !== request.countryCode || !lawyer.isActive ||
      lawyer.status !== "approved" || lawyer.isReviewAccount ||
      lawyer.suspensionType || !lawyer.isEmergencyReady || lawyer.isBusy ||
      lawyer.isAccountClosed || request.excludedLawyerIds.includes(lawyer.id)) {
    return "lawyer_unavailable";
  }
  return "eligible";
}
