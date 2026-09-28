import { describe, expect, it } from "vitest";
import { balanceCanPay, providerBalanceCopy } from "./providerBalance";

describe("provider balance payment presentation", () => {
  it.each([
    ["pending_payment", true],
    ["draft", false],
    ["paid", false],
    ["expired", false],
    ["cancelled", false],
  ])("maps %s payment availability", (status, expected) => {
    expect(balanceCanPay(status)).toBe(expected);
  });

  it("uses the server-confirmed paid state in both languages", () => {
    expect(providerBalanceCopy("paid", true).title).toBe("تم الدفع بنجاح");
    expect(providerBalanceCopy("paid", false).title).toBe("Payment successful");
  });

  it("provides distinct expired and cancelled messages", () => {
    expect(providerBalanceCopy("expired", true).title).toContain("انتهت");
    expect(providerBalanceCopy("cancelled", false).title).toContain("cancelled");
  });
});
