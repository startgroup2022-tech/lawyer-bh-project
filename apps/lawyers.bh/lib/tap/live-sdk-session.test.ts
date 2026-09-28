import { describe, expect, it } from "vitest";

import {
  authorizeLiveSdkTest,
  createTapLiveSdkSession,
} from "./live-sdk-session";

const configuration = {
  publicKey: "pk_live_example",
  secretKey: "sk_live_example",
  merchantId: "28137775",
  postUrl: "https://www.lawyers.bh/api/mobile/tap/webhook",
  accessToken: "diagnostic-token",
};

describe("createTapLiveSdkSession", () => {
  it("signs the fixed 0.100 BHD live test using the Checkout SDK two-decimal input", () => {
    const result = createTapLiveSdkSession(configuration, () =>
      "LSOS-SDK-LIVE-ABC123");

    expect(result).toEqual({
      ok: true,
      purpose: "tap_checkout_flutter_live_test",
      orderReference: "LSOS-SDK-LIVE-ABC123",
      amount: 0.1,
      formattedAmount: "0.10",
      displayAmount: "0.100",
      currency: "BHD",
      tap: {
        publicKey: "pk_live_example",
        merchantId: "28137775",
        mode: "live",
        hashString:
          "bfc978f50abaf257db5785240fff8351b1411b4b6fb5e3e361b38f59fd4654a2",
        postUrl: "https://www.lawyers.bh/api/mobile/tap/webhook",
      },
    });
    expect(JSON.stringify(result)).not.toContain("sk_live_example");
    expect(JSON.stringify(result)).not.toContain("diagnostic-token");
  });

  it.each([
    ["publicKey", "pk_test_wrong"],
    ["secretKey", "sk_test_wrong"],
    ["merchantId", "merchant"],
    ["postUrl", "http://localhost/webhook"],
  ] as const)("rejects invalid live %s configuration", (field, value) => {
    expect(() =>
      createTapLiveSdkSession({ ...configuration, [field]: value }),
    ).toThrow();
  });
});

describe("authorizeLiveSdkTest", () => {
  it("accepts only the configured diagnostic token", () => {
    expect(authorizeLiveSdkTest("diagnostic-token", configuration)).toBe(true);
    expect(authorizeLiveSdkTest("wrong-token", configuration)).toBe(false);
    expect(authorizeLiveSdkTest("", configuration)).toBe(false);
  });
});
