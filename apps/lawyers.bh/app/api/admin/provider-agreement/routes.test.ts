import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";
const state = vi.hoisted(() => ({
  admin: null as { id: string } | null,
  session: null as { providerId: string; countryCode: string } | null,
}));
const repository = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  save: vi.fn(),
  publish: vi.fn(),
  current: vi.fn(),
  snapshot: vi.fn(),
}));
const render = vi.hoisted(() =>
  vi.fn(async (_snapshot: unknown, _preview?: boolean) => {
    void _snapshot;
    void _preview;
    return new Uint8Array([37, 80, 68, 70]);
  }),
);
vi.mock("@/lib/auth/admin-access", () => ({
  requireAdminPermission: async () => state.admin,
}));
vi.mock("@/app/api/provider/_session", () => ({
  getProviderSessionFromRequest: () => state.session,
}));
vi.mock("@/lib/provider-agreement/repository", () => ({
  agreements: repository,
}));
vi.mock("@/lib/provider-agreement/pdf", () => ({ renderProviderPdf: render }));
import { GET, POST } from "./route";
import { POST as publish } from "./publish/route";
import { POST as preview } from "./preview/route";
import { POST as asset } from "./asset/route";
import { GET as signed } from "@/app/api/provider/signed-agreement/route";
import { GET as current } from "@/app/api/public/provider-agreement/route";
import { legacyTemplate } from "@/lib/provider-agreement/model";
const req = (body: unknown) =>
  new Request("https://test.invalid/api", {
    method: "POST",
    headers: {
      origin: "https://test.invalid",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  state.admin = null;
  state.session = null;
});
it("requires admin permission for every management action", async () => {
  for (const response of await Promise.all([
    GET(new Request("https://test.invalid")),
    POST(req({})),
    publish(req({})),
    preview(req({})),
    asset(req({})),
  ]))
    expect(response.status).toBe(403);
  expect(repository.save).not.toHaveBeenCalled();
  expect(render).not.toHaveBeenCalled();
});
it("requires explicit publication confirmation", async () => {
  state.admin = { id: "admin" };
  expect((await publish(req({ id: "x", revision: 1 }))).status).toBe(400);
  expect(repository.publish).not.toHaveBeenCalled();
});
it("normalizes an authenticated upload and rejects cross-origin uploads", async () => {
  state.admin = { id: "admin" };
  const bytes = await sharp({
    create: { width: 40, height: 20, channels: 4, background: "transparent" },
  })
    .png()
    .toBuffer();
  const uploadRequest = (origin: string) =>
    new Request("https://test.invalid/api/admin/provider-agreement/asset", {
      method: "POST",
      headers: { origin, "Content-Type": "image/png" },
      body: new Uint8Array(bytes),
    });
  expect((await asset(uploadRequest("https://other.invalid"))).status).toBe(
    403,
  );
  const response = await asset(uploadRequest("https://test.invalid"));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(
    (
      await sharp(
        Buffer.from(result.dataUrl.split(",")[1], "base64"),
      ).metadata()
    ).width,
  ).toBe(40);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
});
it("protects full version retrieval and returns original assets only to administrators", async () => {
  const request = new Request("https://test.invalid/api?id=version");
  expect((await GET(request)).status).toBe(403);
  state.admin = { id: "admin" };
  repository.get.mockResolvedValue({
    id: "version",
    template: { presentation: { firstParty: { signatureDataUrl: "private" } } },
  });
  expect(
    (await (await GET(request)).json()).version.template.presentation.firstParty
      .signatureDataUrl,
  ).toBe("private");
});
it("exposes only the published template publicly", async () => {
  repository.current.mockResolvedValue({
    id: "current",
    template: legacyTemplate(),
  });
  const response = await current(new Request("https://test.invalid"));
  expect((await response.json()).versionId).toBe("current");
  expect(repository.list).not.toHaveBeenCalled();
  expect(response.headers.get("Cache-Control")).toContain("no-store");
});
it("does not expose platform signing images through the public template endpoint", async () => {
  repository.current.mockResolvedValue({
    id: "current",
    template: {
      ...legacyTemplate(),
      presentation: {
        layout: "modern-v1",
        firstParty: {
          signatureDataUrl: "private-signature",
          stampDataUrl: "private-stamp",
        },
      },
    },
  });
  const response = await current(new Request("https://test.invalid"));
  const data = await response.json();
  expect(data.template).toEqual(legacyTemplate());
  expect(JSON.stringify(data)).not.toContain("private-signature");
});
it("always creates an unsigned preview and never saves the test signature", async () => {
  state.admin = { id: "admin" };
  expect(
    (await preview(req({ template: legacyTemplate(), preview: false }))).status,
  ).toBe(200);
  expect(render.mock.calls[0]?.[1]).toBe(true);
  expect(repository.save).not.toHaveBeenCalled();
  expect(repository.snapshot).not.toHaveBeenCalled();
});
it("blocks id-only and cross-provider signed PDF access", async () => {
  const request = new NextRequest("https://test.invalid/api?id=owner");
  expect((await signed(request)).status).toBe(403);
  state.session = { providerId: "another", countryCode: "BH" };
  expect((await signed(request)).status).toBe(403);
  state.session = { providerId: "owner", countryCode: "AE" };
  expect((await signed(request)).status).toBe(403);
  expect(repository.snapshot).not.toHaveBeenCalled();
});
it("downloads the owner's immutable snapshot, not today's template", async () => {
  state.session = { providerId: "owner", countryCode: "BH" };
  const snapshot = { marker: "immutable" };
  repository.snapshot.mockResolvedValue(snapshot);
  const response = await signed(
    new NextRequest("https://test.invalid/api?id=owner&download=1"),
  );
  expect(response.status).toBe(200);
  expect(render).toHaveBeenCalledWith(snapshot);
  expect(repository.current).not.toHaveBeenCalled();
  expect(response.headers.get("Content-Disposition")).toContain("attachment");
});
