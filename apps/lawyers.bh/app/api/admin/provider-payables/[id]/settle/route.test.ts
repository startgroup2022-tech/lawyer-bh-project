import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminPermission: vi.fn(),
  settleDelayedAllocation: vi.fn(),
}));

vi.mock("@/lib/auth/admin-access", () => ({ requireAdminPermission: mocks.requireAdminPermission }));
vi.mock("@/lib/payments/delayed-settlement", async () => {
  class SettlementError extends Error {
    constructor(public code: string, message: string) { super(message); }
  }
  return { settleDelayedAllocation: mocks.settleDelayedAllocation, SettlementError };
});

import { POST } from "./route";

describe("provider payable settlement route", () => {
  beforeEach(() => {
    mocks.requireAdminPermission.mockReset();
    mocks.settleDelayedAllocation.mockReset();
  });

  it("requires finance permission", async () => {
    mocks.requireAdminPermission.mockResolvedValue(null);
    const response = await POST(new Request("http://localhost", { method: "POST", body: "{}" }), {
      params: Promise.resolve({ id: "allocation_1" }),
    });
    expect(response.status).toBe(403);
  });

  it("records the authenticated administrator", async () => {
    mocks.requireAdminPermission.mockResolvedValue({ id: "admin_1" });
    mocks.settleDelayedAllocation.mockResolvedValue({ id: "allocation_1", settlementStatus: "paid_bank" });
    const response = await POST(new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method: "bank", reference: "BANK-1", transferredAt: "2026-08-18T12:00:00.000Z" }),
    }), { params: Promise.resolve({ id: "allocation_1" }) });

    expect(response.status).toBe(200);
    expect(mocks.settleDelayedAllocation).toHaveBeenCalledWith(expect.objectContaining({
      allocationId: "allocation_1", adminId: "admin_1", method: "bank", reference: "BANK-1",
    }));
  });
});
