import { describe, expect, it } from "vitest";
import { toPublicProviderBalance } from "./provider-balance-public";

const fullRow = {
  id: "07701a3f-a8b9-4d29-a2f7-e932d7cdbb58",
  publicReference: "BAL-ABC123",
  providerId: "provider-secret-id",
  providerNameAr: "المحامي حبيب",
  providerNameEn: "Habib Mohammed",
  customerName: "Ali Customer",
  customerPhone: "+97336005682",
  customerEmail: "customer@example.com",
  description: "Legal consultation",
  amount: "12.000",
  currencyCode: "BHD",
  dueDate: "2026-09-10",
  status: "pending_payment",
  tapChargeId: "chg_secret",
  tapStatus: "INITIATED",
  paidAt: null,
};

describe("public provider balance", () => {
  it("returns the Arabic display contract without private payment data", () => {
    const result = toPublicProviderBalance(fullRow, "ar", new Date("2026-09-06T12:00:00Z"));

    expect(result).toEqual({
      reference: "BAL-ABC123",
      providerName: "المحامي حبيب",
      customerName: "Ali Customer",
      description: "Legal consultation",
      amount: "12.000",
      currencyCode: "BHD",
      dueDate: "2026-09-10",
      status: "pending_payment",
      paidAt: null,
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("customer@example.com");
    expect(serialized).not.toContain("36005682");
    expect(serialized).not.toContain("provider-secret-id");
    expect(serialized).not.toContain("chg_secret");
  });

  it("uses the English provider name and derives an expired public state", () => {
    const result = toPublicProviderBalance(
      { ...fullRow, dueDate: "2026-09-01" },
      "en",
      new Date("2026-09-06T12:00:00Z"),
    );

    expect(result.providerName).toBe("Habib Mohammed");
    expect(result.status).toBe("expired");
  });
});
