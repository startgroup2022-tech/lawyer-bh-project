import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  copy: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/lib/auth/admin-access", () => ({
  requireAdminPermission: mocks.auth,
}));
vi.mock("@/lib/provider-agreement/repository", () => ({
  agreementLibrary: mocks,
}));
import { GET, POST } from "@/app/api/admin/provider-agreement/library/route";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000001" });
});
const request = (action: string, origin = "https://test.invalid") =>
  new Request("https://test.invalid/api/admin/provider-agreement/library", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ action, name: "قالب", description: "" }),
  });
it("blocks the library without admin permission and blocks cross-origin mutations", async () => {
  mocks.auth.mockResolvedValue(null);
  expect((await GET(new Request("https://test.invalid"))).status).toBe(403);
  expect((await POST(request("create"))).status).toBe(403);
  mocks.auth.mockResolvedValue({ id: "00000000-0000-4000-8000-000000000001" });
  expect((await POST(request("create", "https://other.invalid"))).status).toBe(
    403,
  );
  expect(mocks.create).not.toHaveBeenCalled();
});
it("returns private library metadata and rejects unsupported commands", async () => {
  mocks.list.mockResolvedValue([{ id: "one", name: "قالب" }]);
  const result = await GET(new Request("https://test.invalid"));
  expect(await result.json()).toEqual({
    ok: true,
    templates: [{ id: "one", name: "قالب" }],
  });
  expect(result.headers.get("cache-control")).toContain("no-store");
  expect((await POST(request("delete"))).status).toBe(400);
});
