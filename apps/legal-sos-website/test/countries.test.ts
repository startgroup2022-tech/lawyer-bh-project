import { describe, expect, it } from "vitest";
import { knownCountries, resolveCountryFromCoordinates } from "@/lib/countries";

describe("country configuration", () => {
  it("contains exactly the eight approved launch markets", () => {
    expect(knownCountries.map((country) => country.code)).toEqual([
      "SA", "BH", "AE", "KW", "QA", "OM", "TR", "EG",
    ]);
  });

  it("resolves representative coordinates and rejects unsupported regions", () => {
    expect(resolveCountryFromCoordinates(26.22, 50.58)).toBe("BH");
    expect(resolveCountryFromCoordinates(24.71, 46.67)).toBe("SA");
    expect(resolveCountryFromCoordinates(25.2, 55.27)).toBe("AE");
    expect(resolveCountryFromCoordinates(41.01, 28.97)).toBe("TR");
    expect(resolveCountryFromCoordinates(51.51, -0.12)).toBeNull();
  });
});
