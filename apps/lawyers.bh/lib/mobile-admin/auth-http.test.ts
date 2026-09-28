import { describe, expect, it } from "vitest";

import { createMobileAdminAuthHttp } from "./auth-http";

const admin = { id: "550e8400-e29b-41d4-a716-446655440000", fullName: "Admin", email: "a@example.com", role: "admin" as const };

describe("mobile admin auth HTTP", () => {
  it("returns an opaque token without setting a web cookie", async () => {
    const http = createMobileAdminAuthHttp({
      login: async () => ({ token: "opaque-token", expiresInSeconds: 28800, admin }),
      authorize: async () => ({ ...admin, isActive: true, permissions: { manage_requests: true } }),
      logout: async () => {},
    });
    const response = await http.login(new Request("https://example.test/api/mobile/admin/auth/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@example.com", password: "pass" }),
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ ok: true, token: "opaque-token" });
  });

  it("rejects malformed credentials and missing bearer authorization", async () => {
    const http = createMobileAdminAuthHttp({
      login: async () => null,
      authorize: async () => null,
      logout: async () => {},
    });
    const invalid = await http.login(new Request("https://example.test/login", {
      method: "POST", body: JSON.stringify({ email: "", password: "" }),
    }));
    expect(invalid.status).toBe(400);
    const denied = await http.me(new Request("https://example.test/me"));
    expect(denied.status).toBe(401);
    expect(await denied.json()).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("does not call logout without a bearer token", async () => {
    let revoked = false;
    const http = createMobileAdminAuthHttp({
      login: async () => null,
      authorize: async () => null,
      logout: async () => { revoked = true; },
    });
    const response = await http.logout(new Request("https://example.test/logout", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(revoked).toBe(false);
  });

  it("rate-limits before checking the website admin password", async () => {
    let checkedPassword = false;
    const http = createMobileAdminAuthHttp({
      login: async () => { checkedPassword = true; return null; },
      authorize: async () => null,
      logout: async () => {},
    }, async () => false);
    const response = await http.login(new Request("https://example.test/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@example.com", password: "pass" }),
    }));
    expect(response.status).toBe(429);
    expect(checkedPassword).toBe(false);
  });
});
