import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: null as null | { lawyerId: string; countryCode: string },
  create: vi.fn(),
}));

vi.mock("@/lib/mobile-lawyer-auth", () => ({ getMobileLawyerSession: () => mocks.session }));
vi.mock("@/lib/payments/lawyer-withdrawals", () => ({
  createLawyerWithdrawal: mocks.create,
  LawyerWithdrawalError: class LawyerWithdrawalError extends Error {
    constructor(public code: string) { super(code); }
  },
}));

import { POST } from "./route";

describe("mobile lawyer withdrawals route", () => {
  beforeEach(() => { mocks.session = null; mocks.create.mockReset(); });

  it("rejects a missing lawyer session", async () => {
    const response = await POST(new Request("https://example.test", { method: "POST" }));
    expect(response.status).toBe(401);
  });

  it("creates a server-calculated withdrawal for the authenticated lawyer", async () => {
    mocks.session = { lawyerId: "lawyer-1", countryCode: "BH" };
    mocks.create.mockResolvedValue({ id: "withdrawal-1", amount: 20, status: "pending" });
    const response = await POST(new Request("https://example.test", { method: "POST" }));
    expect(mocks.create).toHaveBeenCalledWith("lawyer-1", "BH");
    await expect(response.json()).resolves.toMatchObject({ ok: true, withdrawal: { amount: 20 } });
  });

  it("returns a stable conflict when no balance is available", async () => {
    mocks.session = { lawyerId: "lawyer-1", countryCode: "BH" };
    const { LawyerWithdrawalError } = await import("@/lib/payments/lawyer-withdrawals");
    mocks.create.mockRejectedValue(new LawyerWithdrawalError("no_available_balance"));
    const response = await POST(new Request("https://example.test", { method: "POST" }));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "no_available_balance" });
  });

  it("returns a stable conflict when the lawyer has no withdrawal IBAN", async () => {
    mocks.session = { lawyerId: "lawyer-1", countryCode: "BH" };
    const { LawyerWithdrawalError } = await import("@/lib/payments/lawyer-withdrawals");
    mocks.create.mockRejectedValue(new LawyerWithdrawalError("missing_iban"));

    const response = await POST(new Request("https://example.test", { method: "POST" }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "missing_iban" });
  });
});
