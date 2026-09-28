import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  decideCandidate: vi.fn(),
  sendLawyerPush: vi.fn(async () => ({ sent: 1, failed: 0, pruned: 0 })),
}));

vi.mock("@/lib/sos/mobile-dispatch-auth", () => ({
  bearerToken: vi.fn(() => "token"),
  authorizeMobileDispatchToken: vi.fn(async () => true),
}));
vi.mock("@/lib/sos/live-dispatch-store", () => ({ decideCandidate: mocks.decideCandidate }));
vi.mock("@/lib/sos/mobile-push", () => ({
  mobilePushSender: vi.fn(async () => ({ sendLawyerPush: mocks.sendLawyerPush })),
}));

import { POST } from "./route";

const requestId = "8d983269-123f-49a8-9b62-ccaa7a4e496e";
const candidateId = "8d983269-123f-49a8-9b62-ccaa7a4e496f";
const context = { params: Promise.resolve({ requestId }) };

function request(action: "approve" | "skip") {
  return new Request(`https://lawyers.bh/api/mobile/sos/requests/${requestId}/candidate/decision`, {
    method: "POST",
    headers: { authorization: "Bearer token", "content-type": "application/json" },
    body: JSON.stringify({ action, candidateId }),
  });
}

describe("candidate decision notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("notifies the lawyer only after client approval starts the five-minute window", async () => {
    const deadline = new Date("2026-09-08T07:05:00.000Z");
    mocks.decideCandidate.mockResolvedValue({ approved: true, deadline, locale: "ar" });

    const response = await POST(request("approve"), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ approved: true, deadline: deadline.toISOString() });
    expect(mocks.sendLawyerPush).toHaveBeenCalledWith({
      lawyerId: candidateId,
      eventType: "lawyer_offer",
      requestId,
      locale: "ar",
    });
  });

  it("does not notify a skipped lawyer", async () => {
    mocks.decideCandidate.mockResolvedValue({ approved: false, deadline: null, locale: "ar" });
    await POST(request("skip"), context);
    expect(mocks.sendLawyerPush).not.toHaveBeenCalled();
  });
});
