import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("./settings", () => ({ loadActiveTapConfig: mocks.load }));

import { getTapConfig, getTapMode, getTapSecretKey, setTapConfigOverride } from "./config";
import { ensureTapConfig, refreshTapConfig } from "./hydrate";

const DB_CONFIG = {
  secretKey: "sk_test_db",
  publicKey: "pk_test_db",
  merchantId: "mid-db",
  marketplaceMid: "mp-db",
  mode: "test" as const,
  siteUrl: "https://lawyers.bh",
};

beforeEach(() => {
  setTapConfigOverride(null);
  mocks.load.mockReset();
});

describe("tap config hydration", () => {
  it("uses database credentials once hydrated", async () => {
    mocks.load.mockResolvedValue(DB_CONFIG);
    await ensureTapConfig();
    expect(getTapConfig()).toEqual(DB_CONFIG);
    expect(getTapMode()).toBe("test");
  });

  it("keeps the synchronous contract and never re-reads on every call", async () => {
    mocks.load.mockResolvedValue(DB_CONFIG);
    await ensureTapConfig();
    await ensureTapConfig();
    expect(mocks.load).toHaveBeenCalledTimes(1);
  });

  it("falls back to the environment when no database config exists", async () => {
    mocks.load.mockResolvedValue(null);
    await ensureTapConfig();
    vi.stubEnv("TAP_SECRET_KEY", "sk_live_env");
    expect(getTapSecretKey()).toBe("sk_live_env");
    expect(getTapMode()).toBe("live");
    vi.unstubAllEnvs();
  });

  it("re-reads on refresh so an admin save applies without a restart", async () => {
    mocks.load.mockResolvedValueOnce(DB_CONFIG);
    await ensureTapConfig();
    const liveConfig = { ...DB_CONFIG, secretKey: "sk_live_db", mode: "live" as const };
    mocks.load.mockResolvedValueOnce(liveConfig);
    await refreshTapConfig();
    expect(getTapConfig()).toEqual(liveConfig);
    expect(getTapMode()).toBe("live");
  });

  it("does not throw when the database is unreachable", async () => {
    mocks.load.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(ensureTapConfig()).resolves.toBeUndefined();
    expect(getTapConfig).toBeTypeOf("function");
  });
});
