import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveTapHashPublicKey } from "./hash-public-key";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveTapHashPublicKey", () => {
  it("uses an explicitly configured iOS public key for the hash", () => {
    vi.stubEnv("NEXT_PUBLIC_TAP_PUBLIC_KEY", "pk_test_web");
    vi.stubEnv("TAP_IOS_PUBLIC_KEY", "pk_test_ios");

    expect(resolveTapHashPublicKey("pk_test_ios", "test")).toBe(
      "pk_test_ios",
    );
  });

  it("rejects a client-supplied key that is not configured", () => {
    vi.stubEnv("NEXT_PUBLIC_TAP_PUBLIC_KEY", "pk_test_web");
    vi.stubEnv("TAP_IOS_PUBLIC_KEY", "pk_test_ios");

    expect(() => resolveTapHashPublicKey("pk_test_unknown", "test")).toThrow(
      "Tap public key is not configured for this application",
    );
  });

  it("rejects a live key while the server is in test mode", () => {
    vi.stubEnv("TAP_IOS_PUBLIC_KEY", "pk_live_ios");

    expect(() => resolveTapHashPublicKey("pk_live_ios", "test")).toThrow(
      "Tap public key mode does not match the server mode",
    );
  });
});
