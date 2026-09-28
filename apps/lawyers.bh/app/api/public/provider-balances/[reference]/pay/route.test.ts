import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const balance = {
    id: "07701a3f-a8b9-4d29-a2f7-e932d7cdbb58",
    publicReference: "BAL-ABC12345",
    providerId: "provider-1",
    countryCode: "BH",
    customerName: "Ali Customer",
    customerPhone: "٣٦٠٠٥٦٨٢",
    customerEmail: null,
    description: "Legal consultation",
    amount: "12.000",
    currencyCode: "BHD",
    dueDate: "2030-01-01",
    status: "pending_payment",
    tapChargeId: null,
    tapStatus: null,
  };
  const selectLimit = vi.fn();
  const selectQuery: Record<string, ReturnType<typeof vi.fn>> = {};
  selectQuery.from = vi.fn(() => selectQuery);
  selectQuery.where = vi.fn(() => selectQuery);
  selectQuery.limit = selectLimit;
  const updateReturning = vi.fn();
  const updateQuery: Record<string, ReturnType<typeof vi.fn>> = {};
  updateQuery.set = vi.fn(() => updateQuery);
  updateQuery.where = vi.fn(() => updateQuery);
  updateQuery.returning = updateReturning;
  return { balance, selectLimit, selectQuery, updateQuery, updateReturning };
});

vi.mock("drizzle-orm", () => ({
  and: vi.fn(() => true),
  eq: vi.fn(() => true),
  isNull: vi.fn(() => true),
  or: vi.fn(() => true),
}));
vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn(() => mocks.selectQuery),
    update: vi.fn(() => mocks.updateQuery),
  },
  schema: {
    providerCustomerBalances: new Proxy({}, { get: (_, key) => String(key) }),
    countries: new Proxy({}, { get: (_, key) => String(key) }),
  },
}));
vi.mock("@/lib/tap", () => ({
  createCharge: vi.fn(async () => ({
    id: "chg_123",
    status: "INITIATED",
    transaction: { url: "https://tap.test/pay/chg_123" },
  })),
  siteOrigin: vi.fn(() => "https://www.lawyers.bh"),
}));

import { createCharge } from "@/lib/tap";
import { POST } from "./route";

describe("public provider balance payment initiation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectLimit
      .mockResolvedValueOnce([mocks.balance])
      .mockResolvedValueOnce([{ phoneCode: "+973" }]);
    mocks.updateReturning.mockResolvedValueOnce([{ id: mocks.balance.id }]).mockResolvedValue([]);
  });

  it("creates one Tap charge with normalized contact and a site return URL", async () => {
    const response = await POST(
      new NextRequest("https://www.lawyers.bh/api/public/provider-balances/BAL-ABC12345/pay?locale=ar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceId: "src_bh.benefit" }),
      }),
      { params: Promise.resolve({ reference: "BAL-ABC12345" }) },
    );

    expect(response.status).toBe(200);
    expect(createCharge).toHaveBeenCalledWith(expect.objectContaining({
      amountBD: 12,
      currency: "BHD",
      customer: expect.objectContaining({
        first_name: "Ali",
        phone: { country_code: "973", number: "36005682" },
      }),
      redirect: "https://www.lawyers.bh/ar/payment?balance=BAL-ABC12345",
      post: "https://www.lawyers.bh/api/tap/provider-balance/confirm",
      source: { id: "src_bh.benefit" },
    }));
    await expect(response.json()).resolves.toEqual({
      ok: true,
      transactionUrl: "https://tap.test/pay/chg_123",
      chargeId: "chg_123",
      requiresRedirect: true,
    });
  });

  it("refuses a second charge when the atomic reservation is not acquired", async () => {
    mocks.updateReturning.mockReset().mockResolvedValueOnce([]);
    const response = await POST(
      new NextRequest("https://www.lawyers.bh/api/public/provider-balances/BAL-ABC12345/pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceId: "src_all" }),
      }),
      { params: Promise.resolve({ reference: "BAL-ABC12345" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "PAYMENT_ALREADY_PROCESSING" });
    expect(createCharge).not.toHaveBeenCalled();
  });
});
