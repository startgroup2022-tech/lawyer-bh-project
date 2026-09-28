import { describe, expect, it } from "vitest";

import { canLawyerAccessRealRequest, isServerConfirmedPaid } from "./lawyer-request-eligibility";

describe("lawyer request eligibility", () => {
  it.each([
    ["pending", null],
    ["success", "PENDING"],
    ["failed", "CAPTURED"],
  ])("rejects payment %s / %s", (paymentStatus, tapStatus) => {
    expect(isServerConfirmedPaid({ paymentStatus, tapStatus })).toBe(false);
  });

  it("accepts only server-confirmed captured payment", () => {
    expect(isServerConfirmedPaid({ paymentStatus: "success", tapStatus: "CAPTURED" })).toBe(true);
  });

  it("isolates review accounts even from paid requests", () => {
    expect(canLawyerAccessRealRequest({
      isReviewAccount: true,
      paymentStatus: "success",
      tapStatus: "CAPTURED",
    })).toBe(false);
  });
});
