import { describe, expect, it } from "vitest";

import { validateMobileSdkTestCredentials } from "./mobile-sdk-test-config";

describe("validateMobileSdkTestCredentials", () => {
  it("accepts matching Tap test credentials", () => {
    expect(
      validateMobileSdkTestCredentials({
        secretKey: "sk_test_secret",
        publicKey: "pk_test_public",
      }),
    ).toBeNull();
  });

  it.each([
    ["sk_live_secret", "pk_live_public"],
    ["sk_test_secret", "pk_live_public"],
    ["sk_live_secret", "pk_test_public"],
  ])(
    "rejects credentials outside the Tap test environment",
    (secretKey, publicKey) => {
      expect(
        validateMobileSdkTestCredentials({ secretKey, publicKey }),
      ).toBe("Tap mobile test credentials are required");
    },
  );
});
