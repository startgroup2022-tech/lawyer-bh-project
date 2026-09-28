import { describe, expect, it } from "vitest";
import { createManualAssignmentService, type ManualAssignmentStore } from "./manual-assignment";
import type { ManualAssignmentCase, ManualAssignmentLawyer } from "./escalated-requests-core";

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

describe("manual assignment transaction", () => {
  it("only one admin can assign an escalated request", async () => {
    let assigned: string | null = null;
    let queue = Promise.resolve();
    const store: ManualAssignmentStore = {
      async transaction(work) {
        const previous = queue;
        let unlock = () => {};
        queue = new Promise<void>((resolve) => { unlock = resolve; });
        await previous;
        try { return await work({
          getRequestForUpdate: async () => ({ ...request, assignedLawyerId: assigned }),
          getLawyerForUpdate: async () => lawyer,
          assign: async (_requestId, lawyerId) => { assigned = lawyerId; },
        }); } finally { unlock(); }
      },
    };
    const assign = createManualAssignmentService(store);
    const results = await Promise.all([
      assign({ requestId: "req-1", lawyerId: lawyer.id, adminId: "admin-1" }),
      assign({ requestId: "req-1", lawyerId: lawyer.id, adminId: "admin-2" }),
    ]);
    expect(results.map((item) => item.status).sort()).toEqual(["assigned", "request_unavailable"]);
    expect(assigned).toBe(lawyer.id);
  });

  it("does not write when captured payment or lawyer eligibility is missing", async () => {
    let writes = 0;
    const store: ManualAssignmentStore = {
      async transaction(work) {
        return work({
          getRequestForUpdate: async () => ({ ...request, tapStatus: "INITIATED" }),
          getLawyerForUpdate: async () => lawyer,
          assign: async () => { writes++; },
        });
      },
    };
    expect((await createManualAssignmentService(store)({ requestId: "req", lawyerId: lawyer.id, adminId: "admin" })).status)
      .toBe("request_unavailable");
    expect(writes).toBe(0);
  });
});
