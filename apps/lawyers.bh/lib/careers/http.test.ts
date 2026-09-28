import { describe, it, expect, vi } from "vitest";
const permission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/admin-access", () => ({ requireAdminPermission: permission }));
import { adminEndpoint, readJson, readBytes, publicEndpoint } from "./http";

describe("careers HTTP boundary", () => {
  it("denies a private download before calling its data handler", async () => {
    permission.mockResolvedValue(null); let accessed = false;
    const response = await adminEndpoint(new Request("https://www.lawyers.bh/api/admin/careers"), async () => { accessed = true; return new Response("private"); });
    expect(response.status).toBe(403); expect(accessed).toBe(false);
  });
  it("rejects cross-origin mutations even with an admin session", async () => {
    permission.mockResolvedValue({ id: "admin" }); let accessed = false;
    const response = await adminEndpoint(new Request("https://www.lawyers.bh/api/admin/careers", { method: "POST", headers: { origin: "https://evil.invalid" } }), async () => { accessed = true; return new Response(); });
    expect(response.status).toBe(403); expect(accessed).toBe(false);
  });
  it("bounds streams and rejects malformed JSON", async () => {
    await expect(readBytes(new Request("https://site.invalid", { method: "POST", body: "12345" }), 4)).rejects.toThrow("request_too_large");
    await expect(readJson(new Request("https://site.invalid", { method: "POST", body: "invalid" }))).rejects.toThrow("invalid_input");
  });
  it("never caches public upload errors or exposes exception messages", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await publicEndpoint(new Request("https://www.lawyers.bh/api/careers/applications", { method: "POST", headers: { origin: "https://www.lawyers.bh" } }), async () => { throw new Error("private applicant data"); });
    expect(response.status).toBe(500); expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.text()).not.toContain("private applicant data");
  });
});
