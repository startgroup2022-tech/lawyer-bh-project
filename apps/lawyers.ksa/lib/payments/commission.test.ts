import { describe, expect, it } from "vitest";

import { calculatePlatformOnlyAllocation } from "./allocation-calculation";

describe("calculatePlatformOnlyAllocation", () => {
  it("allocates the complete captured office payment to the platform", () => {
    expect(
      calculatePlatformOnlyAllocation({ grossAmount: 12.345 }),
    ).toEqual({
      grossAmount: 12.35,
      platformPercentage: 100,
      providerPercentage: 0,
      platformAmount: 12.35,
      providerAmount: 0,
    });
  });

  it("keeps Saudi riyal amounts at two decimal places", () => {
    expect(
      calculatePlatformOnlyAllocation({ grossAmount: 10.1236 }),
    ).toEqual({
      grossAmount: 10.12,
      platformPercentage: 100,
      providerPercentage: 0,
      platformAmount: 10.12,
      providerAmount: 0,
    });
  });
});
