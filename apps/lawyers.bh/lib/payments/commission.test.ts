import { describe, expect, it } from "vitest";

import { calculatePlatformOnlyAllocation } from "./allocation-calculation";

describe("calculatePlatformOnlyAllocation", () => {
  it("allocates the complete captured office payment to the platform", () => {
    expect(
      calculatePlatformOnlyAllocation({ grossAmount: 12.345 }),
    ).toEqual({
      grossAmount: 12.345,
      platformPercentage: 100,
      providerPercentage: 0,
      platformAmount: 12.345,
      providerAmount: 0,
    });
  });

  it("keeps Bahrain amounts at three decimal places", () => {
    expect(
      calculatePlatformOnlyAllocation({ grossAmount: 10.1236 }),
    ).toEqual({
      grossAmount: 10.124,
      platformPercentage: 100,
      providerPercentage: 0,
      platformAmount: 10.124,
      providerAmount: 0,
    });
  });
});
