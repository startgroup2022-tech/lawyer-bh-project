import { describe, expect, it } from "vitest";
import { buildLoginRequest } from "./login-routing";

describe("explicit login roles", () => {
  it("never switches a provider login to admin based on an email-like identifier", () => {
    expect(buildLoginRequest("provider", " name@example.com ", "secret", "ar")).toEqual({ endpoint: "/api/provider/login", body: { licenseNumber: "name@example.com", password: "secret" }, destination: "/ar/provider-dashboard" });
  });
  it("uses only the admin API and dashboard for the admin form", () => {
    expect(buildLoginRequest("admin", " admin@example.com ", "secret", "en")).toEqual({ endpoint: "/api/admin-login", body: { email: "admin@example.com", password: "secret" }, destination: "/en/admin" });
  });
});
