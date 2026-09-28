import { describe, expect, it } from "vitest";

import { assertSarCurrency, formatSar } from "./money";

describe("Saudi money", () => {
  it("accepts an omitted or lowercase SAR currency", () => {
    expect(assertSarCurrency(undefined)).toBe("SAR");
    expect(assertSarCurrency("sar")).toBe("SAR");
  });

  it("rejects BHD", () => {
    expect(() => assertSarCurrency("BHD")).toThrowError(
      "KSA_CURRENCY_REQUIRED",
    );
  });

  it("formats an English Saudi price as SAR", () => {
    expect(formatSar(150, "en")).toMatch(/SAR\s*150\.00|150\.00\s*SAR/);
  });

  it("formats Arabic prices using the Saudi locale", () => {
    const formatted = formatSar(150, "ar");
    expect(formatted).toContain("١٥٠");
    expect(formatted).toMatch(/ر\.س\.?/);
  });
});
