import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const balance = {
    id: "07701a3f-a8b9-4d29-a2f7-e932d7cdbb58",
    providerId: "provider-1",
    countryCode: "BH",
    publicReference: "BAL-ABC12345",
    status: "draft",
  };
  const selectQuery: Record<string, ReturnType<typeof vi.fn>> = {};
  selectQuery.from = vi.fn(() => selectQuery);
  selectQuery.where = vi.fn(() => selectQuery);
  selectQuery.limit = vi.fn(async () => [balance]);
  const updateQuery: Record<string, ReturnType<typeof vi.fn>> = {};
  updateQuery.set = vi.fn(() => updateQuery);
  updateQuery.where = vi.fn(async () => undefined);
  return { balance, selectQuery, updateQuery };
});

vi.mock("drizzle-orm", () => ({ and: vi.fn(() => true), eq: vi.fn(() => true) }));
vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn(() => mocks.selectQuery),
    update: vi.fn(() => mocks.updateQuery),
  },
  schema: {
    providerCustomerBalances: {
      id: "id",
      providerId: "providerId",
      countryCode: "countryCode",
      publicReference: "publicReference",
      status: "status",
    },
  },
}));
vi.mock("../../../_session", () => ({
  getProviderSessionFromRequest: vi.fn(() => ({ providerId: "provider-1", countryCode: "BH" })),
}));
vi.mock("../../../_access", () => ({
  getProviderAccessById: vi.fn(async () => ({ access: { canUseDashboard: true } })),
}));
vi.mock("@/lib/tap", () => ({ siteOrigin: vi.fn(() => "https://www.lawyers.bh") }));

import { POST } from "./route";

describe("provider balance site payment link", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores and returns a Lawyers.bh URL without creating a Tap charge", async () => {
    const response = await POST(
      new NextRequest("https://www.lawyers.bh/api/provider/balances/id/payment-link?locale=ar"),
      { params: Promise.resolve({ id: mocks.balance.id }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      paymentUrl: "https://www.lawyers.bh/ar/payment?balance=BAL-ABC12345",
    });
    expect(mocks.updateQuery.set).toHaveBeenCalledWith(expect.objectContaining({
      status: "pending_payment",
      paymentUrl: "https://www.lawyers.bh/ar/payment?balance=BAL-ABC12345",
    }));
  });
});
