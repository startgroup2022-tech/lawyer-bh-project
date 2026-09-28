import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ authenticated: true }));
const store = vi.hoisted(() => ({
  registerLawyerInstallation: vi.fn(async () => undefined),
  unregisterLawyerInstallation: vi.fn(async () => undefined),
}));

vi.mock("@/lib/sos/lawyerAuth", () => ({
  requireAdvocateRequest: vi.fn(async () =>
    auth.authenticated
      ? { ok: true, advocate: { id: "11111111-1111-4111-8111-111111111111", countryCode: "BH" } }
      : { ok: false, status: 401 },
  ),
}));
vi.mock("@/lib/sos/mobile-push-store", () => ({ mobilePushStore: store }));

import { DELETE, PUT } from "./route";

function request(method: "PUT" | "DELETE", body: Record<string, unknown>) {
  return new Request("https://www.lawyers.bh/api/mobile/push/lawyer", {
    method,
    headers: { "content-type": "application/json", authorization: "Bearer token" },
    body: JSON.stringify(body),
  });
}

describe("lawyer mobile push registration", () => {
  beforeEach(() => { vi.clearAllMocks(); auth.authenticated = true; });

  it("rejects an unauthenticated device", async () => {
    auth.authenticated = false;
    const response = await PUT(request("PUT", { token: "fcm-token", platform: "ios", locale: "ar" }));
    expect(response.status).toBe(401);
    expect(store.registerLawyerInstallation).not.toHaveBeenCalled();
  });

  it("derives the lawyer from authentication and ignores a body lawyer id", async () => {
    const response = await PUT(request("PUT", { token: "fcm-token", platform: "ios", locale: "ar", lawyerId: "attacker-controlled" }));
    expect(response.status).toBe(204);
    expect(store.registerLawyerInstallation).toHaveBeenCalledWith({ token: "fcm-token", platform: "ios", locale: "ar", lawyerId: "11111111-1111-4111-8111-111111111111" });
  });

  it("registers an Android lawyer installation", async () => {
    const response = await PUT(request("PUT", { token: "fcm-token", platform: "android", locale: "ar" }));
    expect(response.status).toBe(204);
    expect(store.registerLawyerInstallation).toHaveBeenCalledWith({ token: "fcm-token", platform: "android", locale: "ar", lawyerId: "11111111-1111-4111-8111-111111111111" });
  });

  it("unregisters only the authenticated lawyer binding", async () => {
    const response = await DELETE(request("DELETE", { token: "fcm-token" }));
    expect(response.status).toBe(204);
    expect(store.unregisterLawyerInstallation).toHaveBeenCalledWith("fcm-token", "11111111-1111-4111-8111-111111111111");
  });
});
