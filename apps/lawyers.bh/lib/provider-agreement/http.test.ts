import { beforeEach, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/admin-access", () => ({ requireAdminPermission: auth }));
import { endpoint, readJson } from "./http";
import { signingVersion, previewSignature } from "./validation";
beforeEach(() => auth.mockResolvedValue({ id: "admin" }));
it("blocks admin access and cross-origin writes", async () => {
  const action = vi.fn(async () => Response.json({ ok: true }));
  auth.mockResolvedValue(null);
  expect(
    (await endpoint(new Request("https://test.invalid"), action, true)).status,
  ).toBe(403);
  auth.mockResolvedValue({ id: "admin" });
  expect(
    (
      await endpoint(
        new Request("https://test.invalid", {
          method: "POST",
          headers: { origin: "https://other.invalid" },
        }),
        action,
        true,
      )
    ).status,
  ).toBe(403);
  expect(action).not.toHaveBeenCalled();
});
it("bounds JSON and rejects invalid JSON", async () => {
  await expect(
    readJson(
      new Request("https://test.invalid", { method: "POST", body: "x" }),
    ),
  ).rejects.toThrow("invalid_input");
  await expect(
    readJson(
      new Request("https://test.invalid", {
        method: "POST",
        body: "x".repeat(400001),
      }),
    ),
  ).rejects.toThrow("request_too_large");
});
it("requires the exact disclosed version including legacy", () => {
  expect(signingVersion("legacy", null)).toBeNull();
  expect(signingVersion("v1", { id: "v1" })).toBe("v1");
  expect(() => signingVersion("legacy", { id: "v1" })).toThrow(
    "agreement_version_stale",
  );
  expect(() => signingVersion(null, null)).toThrow("agreement_version_stale");
  expect(() => previewSignature("https://example.invalid/image.png")).toThrow(
    "invalid_signature",
  );
});
