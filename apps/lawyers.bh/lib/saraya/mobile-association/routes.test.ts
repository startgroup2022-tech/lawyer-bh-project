import { afterEach, describe, expect, it, vi } from "vitest";

describe("mobile association routes", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("serves fail-safe well-known payloads through real route exports", async () => {
    vi.stubEnv("SARAYA_ANDROID_SHA256_CERT_FINGERPRINTS", "");
    vi.stubEnv("SARAYA_APPLE_TEAM_ID", "");
    const assetRoute = await import("@/app/.well-known/assetlinks.json/route");
    const appleRoute = await import("@/app/.well-known/apple-app-site-association/route");
    await expect((await assetRoute.GET()).json()).resolves.toEqual([]);
    await expect((await appleRoute.GET()).json()).resolves.toEqual({ applinks: { apps: [], details: [] } });
  });

  it("serves the real HTTPS web fallback route", async () => {
    const route = await import("@/app/saraya/rental-requests/[requestId]/route");
    const response = await route.GET(
      new Request("https://sq.lawyers.bh/saraya/rental-requests/request-1"),
      { params: Promise.resolve({ requestId: "request-1" }) },
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://sq.lawyers.bh/saraya/index.html#/rental-requests/request-1");
  });
});
