import { describe, expect, it } from "vitest";
import {
  calculateDiscount,
  formatHalalas,
  normalizeDiscountCode,
  parseSarToHalalas,
} from "./pricing";

describe("discount pricing", () => {
  it.each([
    [{ originalFils: 1_000, type: "percentage" as const, value: "20" }, 200, 800],
    [{ originalFils: 1_000, type: "fixed" as const, value: "2.50" }, 250, 750],
    [{ originalFils: 100, type: "fixed" as const, value: "5" }, 100, 0],
  ])("calculates exact SAR discounts in halalas", (input, discountFils, finalFils) => {
    expect(calculateDiscount(input)).toEqual({
      originalFils: input.originalFils,
      discountFils,
      finalFils,
    });
  });

  it("rounds percentage discounts to the nearest halala", () => {
    expect(calculateDiscount({ originalFils: 999, type: "percentage", value: "12.5" }).discountFils).toBe(125);
  });

  it("normalizes safe codes and rejects malformed codes", () => {
    expect(normalizeDiscountCode(" welcome-20 ")).toBe("WELCOME-20");
    expect(normalizeDiscountCode("bad code!")).toBeNull();
    expect(normalizeDiscountCode(123)).toBeNull();
  });

  it("converts SAR without floating point drift", () => {
    expect(parseSarToHalalas("10.25")).toBe(1_025);
    expect(formatHalalas(1_025)).toBe("10.25");
    expect(() => parseSarToHalalas("1.009")).toThrow("invalid_sar_amount");
  });
});
