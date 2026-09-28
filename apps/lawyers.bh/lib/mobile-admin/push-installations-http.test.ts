import { describe, expect, it } from "vitest";

import { createAdminPushInstallationsHttp } from "./push-installations-http";

const admin = { id: "admin-a", sessionDigest: "session-a" };
const request = (method: string, body: unknown) => new Request("https://example.test/api/mobile/admin/push-installations", {
  method, headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

describe("admin push installation HTTP boundary", () => {
  it("rejects an unapproved bearer without persisting a token", async () => {
    let writes = 0;
    const route = createAdminPushInstallationsHttp({
      authorize: async () => null,
      register: async () => { writes += 1; },
      remove: async () => { writes += 1; },
    });
    const response = await route.POST(request("POST", { token: "fcm-token-123", platform: "ios", locale: "ar" }));
    expect(response.status).toBe(401);
    expect(writes).toBe(0);
  });

  it("uses the authorized admin ID rather than a forged body ID", async () => {
    let savedAdminId = "";
    let savedSessionDigest = "";
    const route = createAdminPushInstallationsHttp({
      authorize: async () => admin,
      register: async (input) => { savedAdminId = input.adminId; savedSessionDigest = input.sessionDigest; },
      remove: async () => undefined,
    });
    const response = await route.POST(request("POST", { token: "fcm-token-123", platform: "ios", locale: "ar", adminId: "attacker" }));
    expect(response.status).toBe(200);
    expect(savedAdminId).toBe("admin-a");
    expect(savedSessionDigest).toBe("session-a");
  });

  it("rejects invalid platform and returns no token", async () => {
    const route = createAdminPushInstallationsHttp({
      authorize: async () => admin,
      register: async () => undefined,
      remove: async () => undefined,
    });
    const response = await route.POST(request("POST", { token: "fcm-token-123", platform: "web", locale: "ar" }));
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).not.toContain("fcm-token-123");
  });

  it("removes only the token bound to the authenticated admin", async () => {
    let removed = "";
    const route = createAdminPushInstallationsHttp({
      authorize: async () => admin,
      register: async () => undefined,
      remove: async (input) => { removed = `${input.adminId}:${input.token}`; },
    });
    const response = await route.DELETE(request("DELETE", { token: "fcm-token-123", adminId: "attacker" }));
    expect(response.status).toBe(200);
    expect(removed).toBe("admin-a:fcm-token-123");
  });
});
