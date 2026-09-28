import { describe, expect, it } from "vitest";

import {
  createMobileRequestAccessToken,
  digestMobileRequestAccessToken,
  verifyMobileRequestAccessToken,
} from "./mobile-request-access";

describe("mobile request access tokens", () => {
  it("verifies only the token that produced the stored digest", () => {
    const access = createMobileRequestAccessToken();

    expect(access.token).not.toBe(access.digest);
    expect(access.token.length).toBeGreaterThanOrEqual(32);
    expect(access.digest).toBe(digestMobileRequestAccessToken(access.token));
    expect(
      verifyMobileRequestAccessToken(access.token, access.digest),
    ).toBe(true);
    expect(
      verifyMobileRequestAccessToken("wrong-token", access.digest),
    ).toBe(false);
  });

  it("rejects malformed values without throwing", () => {
    expect(verifyMobileRequestAccessToken("", "")).toBe(false);
    expect(verifyMobileRequestAccessToken("token", "not-hex")).toBe(false);
  });
});
