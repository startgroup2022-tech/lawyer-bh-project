import { describe, expect, it } from "vitest";

import { formatMembershipNumber } from "./membership-number";

describe("formatMembershipNumber", () => {
  it("formats the Bahrain sequence in the official six-digit form", () => {
    expect(formatMembershipNumber("BH", 1009)).toBe("LBH-001009");
  });

  it.each([0, -1, 1.5, Number.NaN])(
    "rejects an invalid sequence value",
    (value) => {
      expect(() => formatMembershipNumber("BH", value)).toThrow(
        "Invalid membership sequence value",
      );
    },
  );
});
