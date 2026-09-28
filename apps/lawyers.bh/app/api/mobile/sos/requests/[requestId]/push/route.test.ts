import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ valid: true }));
const store = vi.hoisted(() => ({ subscribeClientRequest: vi.fn(async () => undefined), unsubscribeClientRequest: vi.fn(async () => undefined) }));

vi.mock("@/lib/sos/mobile-dispatch-auth", () => ({ bearerToken: vi.fn(() => "dispatch-token"), authorizeMobileDispatchToken: vi.fn(async () => auth.valid) }));
vi.mock("@/lib/sos/mobile-push-store", () => ({ mobilePushStore: store }));

import { DELETE, PUT } from "./route";

const requestId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const context = { params: Promise.resolve({ requestId }) };
function request(method: "PUT" | "DELETE", body: Record<string, unknown>) {
  return new Request(`https://www.lawyers.bh/api/mobile/sos/requests/${requestId}/push`, { method, headers: { "content-type": "application/json", authorization: "Bearer dispatch-token" }, body: JSON.stringify(body) });
}

describe("client request push subscription", () => {
  beforeEach(() => { vi.clearAllMocks(); auth.valid = true; });

  it("rejects a dispatch token that does not authorize the URL request", async () => {
    auth.valid = false;
    const response = await PUT(request("PUT", { token: "fcm-client", platform: "ios", locale: "en" }), context);
    expect(response.status).toBe(401);
    expect(store.subscribeClientRequest).not.toHaveBeenCalled();
  });

  it("subscribes only the request authorized by its dispatch token", async () => {
    const response = await PUT(request("PUT", { token: "fcm-client", platform: "ios", locale: "en", requestId: "attacker-controlled" }), context);
    expect(response.status).toBe(204);
    expect(store.subscribeClientRequest).toHaveBeenCalledWith({ token: "fcm-client", platform: "ios", locale: "en", requestId });
  });

  it("unsubscribes only the authorized request link", async () => {
    const response = await DELETE(request("DELETE", { token: "fcm-client" }), context);
    expect(response.status).toBe(204);
    expect(store.unsubscribeClientRequest).toHaveBeenCalledWith("fcm-client", requestId);
  });
});
