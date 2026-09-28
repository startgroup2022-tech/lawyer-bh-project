import { describe, expect, it } from "vitest";
import { rentalSubmitResponse } from "./public-contract";

describe("rental public submit contract", () => {
  it("normalizes owner-review and instant responses without removing legacy fields", () => {
    expect(rentalSubmitResponse({
      id: "request-1", propertyId: "property-1", unitId: "unit-1",
      status: "pending_owner_review", resolvedApprovalMode: "owner_review",
    })).toMatchObject({
      id: "request-1", requestId: "request-1", propertyId: "property-1",
      unitId: "unit-1", status: "pending_owner_review",
      resolvedApprovalMode: "owner_review", timeline: expect.any(Array),
    });
    expect(rentalSubmitResponse({
      requestId: "request-2", propertyId: "property-1", unitId: "unit-2",
      status: "approved_awaiting_payment", resolvedApprovalMode: "instant",
      paymentDemandId: "demand-1", totalAmount: "42.000", currency: "BHD",
    })).toMatchObject({ id: "request-2", requestId: "request-2", paymentDemandId: "demand-1" });
  });
});
