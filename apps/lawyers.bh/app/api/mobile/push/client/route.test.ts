import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  registerClientInstallation: vi.fn(async () => undefined),
}));
const limiter = vi.hoisted(() => ({ allowed: true }));

vi.mock("@/lib/sos/mobile-push-store", () => ({ mobilePushStore: store }));
vi.mock("@/lib/sos/client-push-rate-limit", () => ({
  allowClientPushRegistration: vi.fn(() => limiter.allowed),
}));

import { PUT } from "./route";

function request(body: Record<string, unknown>) {
  return new Request("https://www.lawyers.bh/api/mobile/push/client", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.10",
    },
    body: JSON.stringify(body),
  });
}

describe("client mobile push registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    limiter.allowed = true;
  });

  it("registers a valid iPhone installation without exposing its token", async () => {
    const response = await PUT(
      request({ token: "fcm-client", platform: "ios", locale: "ar" }),
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(store.registerClientInstallation).toHaveBeenCalledWith({
      token: "fcm-client",
      platform: "ios",
      locale: "ar",
    });
  });

  it.each([
    [{ token: "", platform: "ios", locale: "ar" }],
    [{ token: "fcm-client", platform: "ios", locale: "fr" }],
  ])("rejects invalid registration input", async (body) => {
    const response = await PUT(request(body));
    expect(response.status).toBe(400);
    expect(store.registerClientInstallation).not.toHaveBeenCalled();
  });

  it("registers a valid Android installation", async () => {
    const response = await PUT(request({ token: "fcm-android", platform: "android", locale: "ar" }));
    expect(response.status).toBe(204);
    expect(store.registerClientInstallation).toHaveBeenCalledWith({ token: "fcm-android", platform: "android", locale: "ar" });
  });

  it("rate limits repeated public registrations", async () => {
    limiter.allowed = false;
    const response = await PUT(
      request({ token: "fcm-client", platform: "ios", locale: "en" }),
    );
    expect(response.status).toBe(429);
    expect(store.registerClientInstallation).not.toHaveBeenCalled();
  });
});
