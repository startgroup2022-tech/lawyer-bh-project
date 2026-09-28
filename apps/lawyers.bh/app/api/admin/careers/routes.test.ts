import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ permission: vi.fn(), getCv: vi.fn(), saveJob: vi.fn(), listJobs: vi.fn(), listApplications: vi.fn(), reviewApplication: vi.fn() }));
vi.mock("@/lib/auth/admin-access", () => ({ requireAdminPermission: mocks.permission }));
vi.mock("@/lib/careers/repository", () => ({ careers: mocks }));
import { GET as download } from "./applications/[id]/cv/route";
import { GET as jobs, POST as create } from "./jobs/route";
import { PATCH as update } from "./jobs/[id]/route";
import { GET as applications } from "./applications/route";
import { PATCH as review } from "./applications/[id]/route";
const origin = "https://www.lawyers.bh";
const context = { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000001" }) };
beforeEach(() => { vi.clearAllMocks(); });
describe("private careers routes", () => {
  it("blocks every private route for unauthorized visitors", async () => {
    mocks.permission.mockResolvedValue(null);
    const get = new Request(`${origin}/api/admin/careers/jobs`);
    const post = () => new Request(`${origin}/api/admin/careers/jobs`, { method: "POST", headers: { origin }, body: "{}" });
    for (const response of [await jobs(get), await create(post()), await update(post(), context), await applications(get), await review(post(), context), await download(get, context)]) expect(response.status).toBe(403);
    expect(mocks.getCv).not.toHaveBeenCalled(); expect(mocks.saveJob).not.toHaveBeenCalled(); expect(mocks.listApplications).not.toHaveBeenCalled();
  });
  it("streams a full 5 MiB private CV in bounded chunks without caching or an inline preview", async () => {
    mocks.permission.mockResolvedValue({ id: "admin" }); const bytes = Buffer.alloc(5 * 1024 * 1024, 65); mocks.getCv.mockResolvedValue(bytes);
    const response = await download(new Request(`${origin}/api/admin/careers/applications/id/cv`), context);
    expect(response.headers.get("content-disposition")).toContain("attachment"); expect(response.headers.get("cache-control")).toContain("no-store");
    const reader = response.body!.getReader(); let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; expect(value.byteLength).toBeLessThanOrEqual(64 * 1024); size += value.byteLength; }
    expect(size).toBe(bytes.length);
  });
});
