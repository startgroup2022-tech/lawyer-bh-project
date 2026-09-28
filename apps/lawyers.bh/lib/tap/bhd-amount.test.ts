import { describe, expect, it } from "vitest";

import { formatTapBhdAmount } from "./bhd-amount";

describe("formatTapBhdAmount", () => {
  it("formats BHD with the three decimals required by Tap", () => {
    expect(formatTapBhdAmount(150)).toBe("150.000");
    expect(formatTapBhdAmount(0.1)).toBe("0.100");
  });
});
