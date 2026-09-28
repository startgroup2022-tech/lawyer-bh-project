import { describe, expect, it } from "vitest";
import { validateProviderBalanceCapture } from "./provider-balance-payment";

const balance = { id: "b1", tapChargeId: "chg_1", amount: "12.345", currencyCode: "BHD", status: "pending_payment" };
const charge = { id: "chg_1", amount: 12.345, currency: "BHD", status: "CAPTURED", metadata: { provider_balance_id: "b1" } };

describe("validateProviderBalanceCapture", () => {
  it("accepts an exact captured payment", () => expect(validateProviderBalanceCapture(balance, charge)).toEqual({ ok: true, alreadyPaid: false }));
  it("is idempotent after payment", () => expect(validateProviderBalanceCapture({ ...balance, status: "paid" }, charge)).toEqual({ ok: true, alreadyPaid: true }));
  it.each([
    [{ ...charge, status: "INITIATED" }, "CHARGE_NOT_CAPTURED"],
    [{ ...charge, id: "chg_2" }, "CHARGE_MISMATCH"],
    [{ ...charge, metadata: { provider_balance_id: "b2" } }, "BALANCE_MISMATCH"],
    [{ ...charge, amount: 10 }, "AMOUNT_MISMATCH"],
    [{ ...charge, currency: "USD" }, "CURRENCY_MISMATCH"],
  ])("rejects mismatched charge", (candidate, code) => expect(validateProviderBalanceCapture(balance, candidate)).toEqual({ ok: false, code }));
});
