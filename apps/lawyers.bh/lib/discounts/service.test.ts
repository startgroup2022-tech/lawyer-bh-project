import { describe, expect, it } from "vitest";
import { evaluateDiscount, type DiscountRecord } from "./service";

const activeCode: DiscountRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  code: "WELCOME20",
  discountType: "percentage",
  discountValue: "20",
  isActive: true,
  startsAt: null,
  endsAt: null,
  totalUsageLimit: null,
  perUserUsageLimit: null,
};

describe("discount validation", () => {
  it("returns a quote for an active code", () => {
    expect(evaluateDiscount({ code: activeCode, originalFils: 10_000, totalUsed: 0, userUsed: 0, now: new Date("2026-08-09T10:00:00Z") })).toMatchObject({
      code: "WELCOME20",
      originalAmountBd: "10.000",
      discountAmountBd: "2.000",
      finalAmountBd: "8.000",
    });
  });

  it.each([
    [{ isActive: false }, "inactive"],
    [{ startsAt: new Date("2026-08-10T00:00:00Z") }, "not_started"],
    [{ endsAt: new Date("2026-08-08T23:59:59Z") }, "expired"],
    [{ totalUsageLimit: 2 }, "total_limit"],
    [{ perUserUsageLimit: 1 }, "user_limit"],
  ])("rejects unavailable codes", (overrides, errorCode) => {
    expect(() => evaluateDiscount({
      code: { ...activeCode, ...overrides },
      originalFils: 10_000,
      totalUsed: "totalUsageLimit" in overrides ? 2 : 0,
      userUsed: "perUserUsageLimit" in overrides ? 1 : 0,
      now: new Date("2026-08-09T10:00:00Z"),
    })).toThrow(errorCode);
  });

  it("rejects a fully discounted payment because Tap needs a positive amount", () => {
    expect(() => evaluateDiscount({
      code: { ...activeCode, discountType: "fixed", discountValue: "20" },
      originalFils: 10_000,
      totalUsed: 0,
      userUsed: 0,
      now: new Date(),
    })).toThrow("zero_total");
  });
});
