import { describe, expect, it } from "vitest";
import {
  canCancelProviderBalance,
  canCreateProviderBalanceLink,
  canDownloadProviderBalanceReceipt,
  normalizeTapCustomerPhone,
  publicBalanceStatus,
  validateProviderBalanceDraft,
} from "./provider-balances";

describe("provider customer balances", () => {
  it("normalizes a valid three-decimal Bahrain balance", () => {
    expect(validateProviderBalanceDraft({ customerName: "Ali", customerPhone: "+97333000000", customerEmail: "ALI@example.com", description: "Legal consultation", amount: "12.345", dueDate: "2030-01-01" })).toEqual({ ok: true, value: { customerName: "Ali", customerPhone: "+97333000000", customerEmail: "ali@example.com", description: "Legal consultation", amount: "12.345", dueDate: "2030-01-01" } });
  });

  it.each(["0", "-1", "1.2345", "1000000", "text"])("rejects invalid amount %s", (amount) => {
    expect(validateProviderBalanceDraft({ customerName: "Ali", customerPhone: "333", description: "Service", amount })).toMatchObject({ ok: false, code: "BALANCE_AMOUNT_INVALID" });
  });

  it("requires customer identity and a description", () => {
    expect(validateProviderBalanceDraft({ customerName: "", customerPhone: "", description: "", amount: "10" })).toMatchObject({ ok: false, code: "BALANCE_REQUIRED_FIELDS" });
  });

  it.each([
    ["٣٦٠٠٥٦٨٢", "+973", { countryCode: "973", number: "36005682" }],
    ["+۹۷۳ ۳۶۰۰۵۶۸۲", "973", { countryCode: "973", number: "36005682" }],
    ["+966 50 123 4567", "+966", { countryCode: "966", number: "501234567" }],
  ])("normalizes localized phone digits for Tap", (phone, dialCode, expected) => {
    expect(normalizeTapCustomerPhone(phone, dialCode)).toEqual(expected);
  });

  it("derives expiration without overwriting a terminal state", () => {
    expect(publicBalanceStatus("pending_payment", "2026-09-01", new Date("2026-09-06T12:00:00Z"))).toBe("expired");
    expect(publicBalanceStatus("paid", "2026-09-01", new Date("2026-09-06T12:00:00Z"))).toBe("paid");
    expect(publicBalanceStatus("cancelled", null, new Date("2026-09-06T12:00:00Z"))).toBe("cancelled");
  });

  it("allows paid receipt only after a captured payment", () => {
    expect(canDownloadProviderBalanceReceipt("paid", "CAPTURED")).toBe(true);
    expect(canDownloadProviderBalanceReceipt("paid", "INITIATED")).toBe(false);
    expect(canDownloadProviderBalanceReceipt("pending_payment", "CAPTURED")).toBe(false);
  });

  it.each([
    ["draft", true, true],
    ["expired", true, true],
    ["pending_payment", false, true],
    ["paid", false, false],
    ["cancelled", false, false],
  ])("enforces transitions for %s", (status, canLink, canCancel) => {
    expect(canCreateProviderBalanceLink(status)).toBe(canLink);
    expect(canCancelProviderBalance(status)).toBe(canCancel);
  });
});
