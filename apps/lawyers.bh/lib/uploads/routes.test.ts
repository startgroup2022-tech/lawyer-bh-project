import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const state = vi.hoisted(() => ({
  admin: vi.fn(),
  provider: vi.fn(),
  owner: vi.fn(),
  sign: vi.fn(),
}));
vi.mock("@/lib/auth/admin-access", () => ({
  requireAdminPermission: state.admin,
}));
vi.mock("@/app/api/provider/_session", () => ({
  getProviderSessionFromRequest: state.provider,
}));
vi.mock("@/lib/uploads/documents", () => ({
  documentOwner: state.owner,
  privateDownload: state.sign,
}));
import { GET } from "@/app/api/provider-documents/[id]/route";
beforeEach(() => {
  vi.resetAllMocks();
  state.admin.mockResolvedValue(null);
  state.provider.mockReturnValue(null);
});
const request = () =>
  new NextRequest("https://example.test/api/provider-documents/42");
const context = { params: Promise.resolve({ id: "42" }) };
it("denies anonymous document access", async () => {
  expect((await GET(request(), context)).status).toBe(401);
  expect(state.sign).not.toHaveBeenCalled();
});
it("denies a different owner or country without signing a download", async () => {
  state.provider.mockReturnValue({ providerId: "other", countryCode: "BH" });
  state.owner.mockResolvedValue({
    id: "owner",
    country_code: "BH",
    is_active: true,
  });
  expect((await GET(request(), context)).status).toBe(404);
  state.provider.mockReturnValue({ providerId: "owner", countryCode: "SA" });
  expect((await GET(request(), context)).status).toBe(404);
  expect(state.sign).not.toHaveBeenCalled();
});
it("returns a non-cacheable private redirect only for the owner", async () => {
  state.provider.mockReturnValue({ providerId: "owner", countryCode: "BH" });
  state.owner.mockResolvedValue({
    id: "owner",
    country_code: "BH",
    is_active: true,
  });
  state.sign.mockResolvedValue("https://private.example.test/signed");
  const response = await GET(request(), context);
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe(
    "https://private.example.test/signed",
  );
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
