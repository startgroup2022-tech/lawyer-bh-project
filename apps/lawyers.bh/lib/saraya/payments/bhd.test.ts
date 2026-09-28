import { describe, expect, it } from "vitest";
import { parseBhdMills } from "./bhd";

describe("strict BHD amounts", () => {
  it.each(["0.000", "550.000", "1.234"])("parses canonical three-decimal strings: %s", (value) => {
    expect(parseBhdMills(value)).toBe(BigInt(value.replace(".", "")));
  });

  it.each(["1", "1.2", "1.2300", "1.2345", "1e3", -1, 1.2345, Number.NaN])("rejects non-canonical or extra precision: %s", (value) => {
    expect(() => parseBhdMills(value)).toThrow("INVALID_BHD_AMOUNT");
  });

  it("accepts provider JSON numbers only when exactly representable in fils", () => {
    expect(parseBhdMills(550)).toBe(BigInt(550000));
    expect(parseBhdMills(1.234)).toBe(BigInt(1234));
  });
});
