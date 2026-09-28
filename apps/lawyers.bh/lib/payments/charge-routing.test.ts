import { describe, expect, it } from "vitest";

import { getChargeRecipient } from "./charge-routing";

describe("getChargeRecipient", () => {
  it("keeps a non-Tap lawyer charge in the platform account for delayed settlement", () => {
    expect(getChargeRecipient({
      assignmentMode: "lawyer",
      providerId: "law_1",
      payoutReady: false,
      destinationId: null,
    })).toEqual({
      mode: "platform",
      destinationId: null,
      allocationMode: "delayed",
    });
  });

  it("routes a payout-ready lawyer to the confirmed Tap destination", () => {
    expect(getChargeRecipient({
      assignmentMode: "lawyer",
      providerId: "law_1",
      payoutReady: true,
      destinationId: "dest_1",
    })).toEqual({
      mode: "provider",
      destinationId: "dest_1",
      allocationMode: "provider",
    });
  });

  it("rejects inconsistent payout readiness without a destination", () => {
    expect(() => getChargeRecipient({
      assignmentMode: "lawyer",
      providerId: "law_1",
      payoutReady: true,
      destinationId: null,
    })).toThrow("must have a Tap destination");
  });
});
