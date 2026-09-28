import { expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/lib/countries/product-access", () => ({
  requireCountryProduct: vi.fn(async () => {
    throw Object.assign(new Error("COUNTRY_PRODUCT_DISABLED"), { code: "COUNTRY_PRODUCT_DISABLED" });
  }),
  mapCountryProductAccessError: vi.fn((error: { code?: string }) => error.code === "COUNTRY_PRODUCT_DISABLED"
    ? { status: 403, body: { error: "COUNTRY_PRODUCT_DISABLED" } }
    : null),
}));
vi.mock("@/lib/publicLawyers", () => ({ getPublicLawyers: calls.list }));

import { GET } from "./route";

it("blocks lawyer discovery before loading providers when the platform is disabled", async () => {
  const response = await GET(new Request("https://lawyers.bh/api/available-lawyers?countryCode=SA"));
  expect(response.status).toBe(403);
  await expect(response.json()).resolves.toEqual({ error: "COUNTRY_PRODUCT_DISABLED" });
  expect(calls.list).not.toHaveBeenCalled();
});
