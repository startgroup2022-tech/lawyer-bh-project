import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getTapConfig,
  getTapMode,
  getTapSecretKey,
  isTapEnabled,
} from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Tap configuration", () => {
  it("allows Tap to be explicitly disabled without breaking public reads", () => {
    vi.stubEnv("TAP_ENABLED", "false");
    vi.stubEnv("TAP_SECRET_KEY", "");

    expect(isTapEnabled()).toBe(false);
    expect(getTapMode()).toBe("test");
    expect(() => getTapConfig()).toThrow(
      "Tap payments are currently disabled",
    );
    expect(() => getTapSecretKey()).toThrow(
      "Tap payments are currently disabled",
    );
  });

  it("is enabled automatically when a server secret exists", () => {
    vi.stubEnv("TAP_ENABLED", "");
    vi.stubEnv("TAP_SECRET_KEY", "sk_test_example");

    expect(isTapEnabled()).toBe(true);
  });

  it("uses the configured test marketplace MID", () => {
    vi.stubEnv("TAP_ENABLED", "true");
    vi.stubEnv("TAP_SECRET_KEY", "sk_test_example");
    vi.stubEnv("NEXT_PUBLIC_TAP_PUBLIC_KEY", "pk_test_example");
    vi.stubEnv("TAP_MERCHANT_ID", "27432553");
    vi.stubEnv("TAP_MARKETPLACE_MID", "27432553");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lawyers.bh/");

    expect(getTapConfig()).toEqual({
      secretKey: "sk_test_example",
      publicKey: "pk_test_example",
      merchantId: "27432553",
      marketplaceMid: "27432553",
      mode: "test",
      siteUrl: "https://lawyers.bh",
    });
  });

  it("trims and returns the server-only secret independently", () => {
    vi.stubEnv("TAP_ENABLED", "true");
    vi.stubEnv("TAP_SECRET_KEY", "  sk_live_example  ");

    expect(getTapSecretKey()).toBe("sk_live_example");
  });

  it("detects live mode from the server secret", () => {
    vi.stubEnv("TAP_ENABLED", "true");
    vi.stubEnv("TAP_SECRET_KEY", "sk_live_example");
    vi.stubEnv("NEXT_PUBLIC_TAP_PUBLIC_KEY", "pk_live_example");
    vi.stubEnv("TAP_MERCHANT_ID", "live_merchant");
    vi.stubEnv("TAP_MARKETPLACE_MID", "live_marketplace");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lawyers.bh");

    expect(getTapConfig().mode).toBe("live");
    expect(getTapMode()).toBe("live");
  });
});