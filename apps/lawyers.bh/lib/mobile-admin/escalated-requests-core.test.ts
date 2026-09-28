import { describe, expect, it } from "vitest";
import { canManuallyAssign, type ManualAssignmentCase, type ManualAssignmentLawyer } from "./escalated-requests-core";

const request: ManualAssignmentCase = {
  paymentStatus: "success", tapStatus: "CAPTURED", serviceStatus: "pending",
  adminEscalatedAt: new Date("2026-09-20T08:00:00Z"), assignedLawyerId: null,
  candidateLawyerId: null, countryCode: "BH", excludedLawyerIds: [],
};
const lawyer: ManualAssignmentLawyer = {
  id: "lawyer-1", countryCode: "BH", isActive: true, status: "approved",
  isReviewAccount: false, suspensionType: null, isEmergencyReady: true,
  isBusy: false, isAccountClosed: false,
};

describe("manual SOS assignment policy", () => {
  it("accepts only a captured, escalated, still-unassigned request and eligible lawyer", () => {
    expect(canManuallyAssign(request, lawyer)).toBe("eligible");
    expect(canManuallyAssign({ ...request, paymentStatus: "pending" }, lawyer)).toBe("request_unavailable");
    expect(canManuallyAssign({ ...request, tapStatus: "INITIATED" }, lawyer)).toBe("request_unavailable");
    expect(canManuallyAssign({ ...request, adminEscalatedAt: null }, lawyer)).toBe("request_unavailable");
    expect(canManuallyAssign({ ...request, assignedLawyerId: "other" }, lawyer)).toBe("request_unavailable");
    expect(canManuallyAssign({ ...request, candidateLawyerId: "other" }, lawyer)).toBe("request_unavailable");
    expect(canManuallyAssign({ ...request, serviceStatus: "cancelled" }, lawyer)).toBe("request_unavailable");
  });

  it("rejects cross-country, blocked, busy and unapproved lawyers", () => {
    expect(canManuallyAssign(request, { ...lawyer, countryCode: "SA" })).toBe("lawyer_unavailable");
    expect(canManuallyAssign({ ...request, excludedLawyerIds: [lawyer.id] }, lawyer)).toBe("lawyer_unavailable");
    expect(canManuallyAssign(request, { ...lawyer, isBusy: true })).toBe("lawyer_unavailable");
    expect(canManuallyAssign(request, { ...lawyer, status: "pending" })).toBe("lawyer_unavailable");
    expect(canManuallyAssign(request, { ...lawyer, isActive: false })).toBe("lawyer_unavailable");
    expect(canManuallyAssign(request, { ...lawyer, isAccountClosed: true })).toBe("lawyer_unavailable");
  });
});
