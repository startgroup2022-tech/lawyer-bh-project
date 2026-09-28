import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ permission: vi.fn(), transition: vi.fn() }));
vi.mock("@/lib/auth/admin-access", () => ({ requireAdminPermission: mocks.permission }));
vi.mock("@/lib/payments/lawyer-withdrawals", () => ({
  transitionLawyerWithdrawal: mocks.transition,
  LawyerWithdrawalError: class LawyerWithdrawalError extends Error {
    constructor(public code: string) { super(code); }
  },
}));

import { POST } from "./route";

describe("admin lawyer withdrawal action", () => {
  beforeEach(() => { mocks.permission.mockReset(); mocks.transition.mockReset(); });

  it("requires finance permission", async () => {
    mocks.permission.mockResolvedValue(null);
    const response = await POST(new Request("http://localhost", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "w1" }) });
    expect(response.status).toBe(403);
  });

  it("records manual payment reference and authenticated administrator", async () => {
    mocks.permission.mockResolvedValue({ id: "admin-1" });
    mocks.transition.mockResolvedValue({ id: "w1", status: "paid" });
    const response = await POST(new Request("http://localhost", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "paid", settlementReference: "BANK-42" }),
    }), { params: Promise.resolve({ id: "w1" }) });
    expect(response.status).toBe(200);
    expect(mocks.transition).toHaveBeenCalledWith({ withdrawalId: "w1", action: "paid", adminId: "admin-1", settlementReference: "BANK-42" });
  });
});
