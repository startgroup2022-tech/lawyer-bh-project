import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), provision: vi.fn() }));
vi.mock("@/lib/auth/admin-access", () => ({ requireSuperAdmin: mocks.admin }));
vi.mock("@/lib/countries/provisioning", () => ({
  provisionCountryDatabase: mocks.provision,
}));

import { POST } from "./route";

beforeEach(() => vi.resetAllMocks());

function request(origin = "https://lawyers.bh") {
  return new Request("https://lawyers.bh/api/admin/country-settings/provision", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({
      code: "SA",
      phoneCode: "+966",
      currencyCode: "SAR",
      defaultLocale: "ar",
    }),
  });
}

it("blocks provisioning without a super administrator", async () => {
  mocks.admin.mockResolvedValue(null);
  expect((await POST(request())).status).toBe(403);
  expect(mocks.provision).not.toHaveBeenCalled();
});

it("blocks cross-origin provisioning", async () => {
  mocks.admin.mockResolvedValue({ id: "admin" });
  expect((await POST(request("https://evil.example"))).status).toBe(403);
  expect(mocks.provision).not.toHaveBeenCalled();
});

it("delegates one idempotent provisioning operation", async () => {
  mocks.admin.mockResolvedValue({ id: "admin" });
  mocks.provision.mockResolvedValue({ code: "SA", tablesProvisioned: true });

  const response = await POST(request());

  expect(response.status).toBe(200);
  expect(mocks.provision).toHaveBeenCalledWith({
    code: "SA",
    phoneCode: "+966",
    currencyCode: "SAR",
    defaultLocale: "ar",
  });
  expect(await response.json()).toEqual({
    ok: true,
    country: { code: "SA", tablesProvisioned: true },
  });
});
