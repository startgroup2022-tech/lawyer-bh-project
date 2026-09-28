import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createMobileDispatchToken,
  verifyMobileDispatchToken,
} from "./mobile-dispatch-auth";

describe("mobile dispatch request token", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("binds an opaque token to one paid booking", () => {
    vi.stubEnv("MOBILE_DISPATCH_SECRET", "test-secret-with-at-least-32-characters");

    const token = createMobileDispatchToken(
      "018f47de-8f4e-7dd1-9f41-f0f56365e902",
    );

    expect(token).not.toContain("018f47de");
    expect(
      verifyMobileDispatchToken(
        "018f47de-8f4e-7dd1-9f41-f0f56365e902",
        token,
      ),
    ).toBe(true);
    expect(
      verifyMobileDispatchToken(
        "018f47de-8f4e-7dd1-9f41-f0f56365e999",
        token,
      ),
    ).toBe(false);
    expect(
      verifyMobileDispatchToken(
        "018f47de-8f4e-7dd1-9f41-f0f56365e902",
        `${token}x`,
      ),
    ).toBe(false);
  });
});
