import { describe, expect, it } from "vitest";
import { createManualAssignmentHttp } from "./manual-assignment-http";

const requestId = "22222222-2222-4222-8222-222222222222";
const lawyerId = "11111111-1111-4111-8111-111111111111";
const adminId = "33333333-3333-4333-8333-333333333333";
const request = () => new Request(`https://lawyers.bh/api/mobile/admin/escalated-requests/${requestId}/assign`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lawyerId }),
});

describe("mobile admin manual assignment HTTP", () => {
  it("does not assign for an unauthorised role", async () => {
    let assignments = 0;
    const handler = createManualAssignmentHttp({
      authorize: async () => null,
      assign: async () => { assignments++; return { status: "assigned" }; },
      afterAssignment: async () => ({ allocationRecorded: true, notificationsSent: true }),
    });
    expect((await handler(request(), requestId)).status).toBe(401);
    expect(assignments).toBe(0);
  });

  it("returns a conflict without claiming payment failure when the case changed", async () => {
    const handler = createManualAssignmentHttp({
      authorize: async () => ({ id: adminId }),
      assign: async () => ({ status: "request_unavailable" }),
      afterAssignment: async () => { throw new Error("must not notify"); },
    });
    const response = await handler(request(), requestId);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ ok: false, error: "request_unavailable" });
  });

  it("reports confirmed assignment even when a post-commit notification needs retry", async () => {
    const handler = createManualAssignmentHttp({
      authorize: async () => ({ id: adminId }),
      assign: async () => ({ status: "assigned" }),
      afterAssignment: async () => ({ allocationRecorded: true, notificationsSent: false }),
    });
    const response = await handler(request(), requestId);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, status: "assigned", allocationRecorded: true, notificationsSent: false });
  });
});
