import { describe, expect, it } from "vitest";
import {
  calculateDiscount,
  formatFils,
  normalizeDiscountCode,
  parseBhdToFils,
} from "./pricing";

describe("discount pricing", () => {
  it.each([
    [{ originalFils: 10_000, type: "percentage" as const, value: "20" }, 2_000, 8_000],
    [{ originalFils: 10_000, type: "fixed" as const, value: "2.500" }, 2_500, 7_500],
    [{ originalFils: 1_000, type: "fixed" as const, value: "5" }, 1_000, 0],
  ])("calculates exact BHD discounts in fils", (input, discountFils, finalFils) => {
    expect(calculateDiscount(input)).toEqual({
      originalFils: input.originalFils,
      discountFils,
      finalFils,
    });
  });

  it("rounds percentage discounts to the nearest fil", () => {
    expect(calculateDiscount({ originalFils: 9_999, type: "percentage", value: "12.5" }).discountFils).toBe(1_250);
  });

  it("normalizes safe codes and rejects malformed codes", () => {
    expect(normalizeDiscountCode(" welcome-20 ")).toBe("WELCOME-20");
    expect(normalizeDiscountCode("bad code!")).toBeNull();
    expect(normalizeDiscountCode(123)).toBeNull();
  });

  it("converts BHD without floating point drift", () => {
    expect(parseBhdToFils("10.125")).toBe(10_125);
    expect(formatFils(10_125)).toBe("10.125");
    expect(() => parseBhdToFils("1.0009")).toThrow("invalid_bhd_amount");
  });
});
