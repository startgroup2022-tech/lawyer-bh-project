import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sql: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ sqlClient: mocks.sql }));

import { GET } from "./route";

const row = (overrides: Record<string, unknown> = {}) => [{
  backgroundUrl: "https://cdn.example/bg.webp",
  backgroundOpacity: 60,
  overlayOpacity: 25,
  backgroundColor: "#082b67",
  ...overrides,
}];

describe("public mobile appearance API", () => {
  beforeEach(() => mocks.sql.mockReset());

  it("returns the stored background with clamped percentages and upper-case colour", async () => {
    mocks.sql.mockResolvedValueOnce(row());
    const response = await GET(new Request("https://lawyers.bh/api/mobile/appearance?countryCode=bh"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toEqual({
      ok: true,
      countryCode: "BH",
      appearance: {
        backgroundUrl: "https://cdn.example/bg.webp",
        backgroundOpacity: 60,
        overlayOpacity: 25,
        backgroundColor: "#082B67",
      },
    });
  });

  it("answers with defaults when the country has no saved settings", async () => {
    mocks.sql.mockResolvedValueOnce([]);
    const payload = await (await GET(new Request("https://lawyers.bh/api/mobile/appearance"))).json();

    expect(payload.countryCode).toBe("BH");
    expect(payload.appearance).toEqual({
      backgroundUrl: null,
      backgroundOpacity: 100,
      overlayOpacity: 0,
      backgroundColor: null,
    });
  });

  it("never fails the app's first paint when the database is unreachable", async () => {
    mocks.sql.mockRejectedValueOnce(new Error("database unavailable"));
    const response = await GET(new Request("https://lawyers.bh/api/mobile/appearance?countryCode=BH"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.appearance.backgroundOpacity).toBe(100);
    expect(payload.appearance.backgroundUrl).toBeNull();
  });

  it("rejects a non-HTTPS image and an out-of-range or malformed value", async () => {
    mocks.sql.mockResolvedValueOnce(row({
      backgroundUrl: "http://insecure.test/bg.png",
      backgroundOpacity: 250,
      overlayOpacity: -5,
      backgroundColor: "red",
    }));
    const payload = await (await GET(new Request("https://lawyers.bh/api/mobile/appearance"))).json();

    expect(payload.appearance.backgroundUrl).toBeNull();
    expect(payload.appearance.backgroundOpacity).toBe(100);
    expect(payload.appearance.overlayOpacity).toBe(0);
    expect(payload.appearance.backgroundColor).toBeNull();
  });

  it("falls back to Bahrain for an invalid country code without querying", async () => {
    const response = await GET(new Request("https://lawyers.bh/api/mobile/appearance?countryCode=1!"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.countryCode).toBe("BH");
    expect(mocks.sql).not.toHaveBeenCalled();
  });
});
