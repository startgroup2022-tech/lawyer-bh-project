import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: null as null | { lawyerId: string; countryCode: string },
  getLawyerEarnings: vi.fn(),
}));

vi.mock("@/lib/mobile-lawyer-auth", () => ({
  getMobileLawyerSession: () => mocks.session,
}));
vi.mock("@/lib/payments/lawyer-withdrawals", () => ({
  getLawyerEarnings: mocks.getLawyerEarnings,
}));

import { GET } from "./route";

describe("mobile lawyer earnings route", () => {
  beforeEach(() => {
    mocks.session = null;
    mocks.getLawyerEarnings.mockReset();
  });

  it("rejects a missing lawyer session", async () => {
    const response = await GET(new Request("https://example.test/api/mobile/lawyer/earnings"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "unauthenticated" });
  });

  it("returns only the authenticated lawyer earnings", async () => {
    mocks.session = { lawyerId: "lawyer-1", countryCode: "BH" };
    mocks.getLawyerEarnings.mockResolvedValue({ available: 12.5, transactions: [] });
    const response = await GET(new Request("https://example.test/api/mobile/lawyer/earnings"));
    expect(response.status).toBe(200);
    expect(mocks.getLawyerEarnings).toHaveBeenCalledWith("lawyer-1", "BH");
    await expect(response.json()).resolves.toMatchObject({ ok: true, summary: { available: 12.5 } });
  });
});
