import { describe, expect, it } from "vitest";

import {
  parsePaymentRequestIdentity,
  tapOrderReference,
} from "./request-identity";

const requestId = "018f47de-8f4e-7dd1-9f41-f0f56365e902";

describe("typed payment request identity", () => {
  it("accepts only a known type with a UUID", () => {
    expect(
      parsePaymentRequestIdentity({ requestType: "emergency", requestId }),
    ).toEqual({ requestType: "emergency", requestId });
    expect(
      parsePaymentRequestIdentity({ requestType: "booking", requestId }),
    ).toBeNull();
    expect(
      parsePaymentRequestIdentity({ requestType: "consultation", requestId: "no" }),
    ).toBeNull();
  });

  it("uses a distinct server-derived Tap reference for each request type", () => {
    expect(tapOrderReference({ requestType: "emergency", requestId })).toBe(
      "LSOS-SOS-018F47DE",
    );
    expect(tapOrderReference({ requestType: "consultation", requestId })).toBe(
      "LSOS-BK-018F47DE",
    );
  });
});
