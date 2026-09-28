import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const balance = {
    id: "balance-1", providerId: "provider-1", countryCode: "BH",
    publicReference: "BAL-ABC12345", providerNameAr: "المحامي حبيب",
    providerNameEn: "Habib Mohammed", customerName: "Ali",
    description: "Consultation", amount: "12.000", currencyCode: "BHD",
    dueDate: null, status: "pending_payment", tapStatus: "INITIATED", paidAt: null,
  };
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  query.from = vi.fn(() => query);
  query.where = vi.fn(() => query);
  query.limit = vi.fn(async () => [balance]);
  return { balance, query };
});

vi.mock("drizzle-orm", () => ({ and: vi.fn(() => true), eq: vi.fn(() => true) }));
vi.mock("@/lib/db/client", () => ({
  db: { select: vi.fn(() => mocks.query) },
  schema: { providerCustomerBalances: new Proxy({}, { get: (_, key) => String(key) }) },
}));
vi.mock("../../_session", () => ({
  getProviderSessionFromRequest: vi.fn(() => ({ providerId: "provider-1", countryCode: "BH" })),
}));
vi.mock("@/lib/payments/provider-balance-pdf", () => ({
  renderProviderBalancePdf: vi.fn(async () => new TextEncoder().encode("%PDF-test")),
}));

import { GET as invoice } from "./invoice/route";
import { GET as receipt } from "./receipt/route";

describe("provider balance documents", () => {
  beforeEach(() => { mocks.balance.status = "pending_payment"; mocks.balance.tapStatus = "INITIATED"; });

  it("downloads an owned balance invoice", async () => {
    const response = await invoice(new NextRequest("https://lawyers.bh/api/provider/balances/balance-1/invoice?locale=ar"), { params: Promise.resolve({ id: "balance-1" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("invoice-BAL-ABC12345.pdf");
  });

  it("blocks a receipt until Tap capture is confirmed", async () => {
    const response = await receipt(new NextRequest("https://lawyers.bh/api/provider/balances/balance-1/receipt?locale=en"), { params: Promise.resolve({ id: "balance-1" }) });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "RECEIPT_NOT_AVAILABLE" });
  });
});
