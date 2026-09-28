import { describe, expect, it } from "vitest";
import { runManualAssignmentFollowUp } from "./manual-assignment-follow-up";

describe("post-commit manual assignment follow-up", () => {
  it("never changes a confirmed assignment into a payment failure when push fails", async () => {
    const result = await runManualAssignmentFollowUp({ requestId: "request", lawyerId: "lawyer" }, {
      load: async () => ({ countryCode: "BH", tapChargeId: "charge", grossAmount: 150, locale: "ar" }),
      allocate: async () => {},
      notifyClient: async () => { throw new Error("push offline"); },
      notifyLawyer: async () => {},
      recordFailure: async () => {},
    });
    expect(result).toEqual({ allocationRecorded: true, notificationsSent: false });
  });

  it("records allocation failure but still attempts both notifications", async () => {
    let notifications = 0;
    let failure = "";
    const result = await runManualAssignmentFollowUp({ requestId: "request", lawyerId: "lawyer" }, {
      load: async () => ({ countryCode: "BH", tapChargeId: "charge", grossAmount: 150, locale: "ar" }),
      allocate: async () => { throw new Error("commission unavailable"); },
      notifyClient: async () => { notifications++; },
      notifyLawyer: async () => { notifications++; },
      recordFailure: async (kind) => { failure = kind; },
    });
    expect(result).toEqual({ allocationRecorded: false, notificationsSent: true });
    expect(notifications).toBe(2);
    expect(failure).toBe("allocation_failed");
  });
});
