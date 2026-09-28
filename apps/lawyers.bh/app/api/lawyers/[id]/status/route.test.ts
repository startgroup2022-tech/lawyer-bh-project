import { expect, it, vi } from "vitest";

const update = vi.hoisted(() => vi.fn());
vi.mock("@/lib/mobile-lawyer-auth", () => ({
  getMobileLawyerSession: vi.fn(async () => ({ lawyerId: "lawyer-1", countryCode: "BH" })),
}));
vi.mock("@/lib/countries/product-access", () => ({
  requireCountryProduct: vi.fn(async () => { throw Object.assign(new Error("COUNTRY_PRODUCT_DISABLED"), { code: "COUNTRY_PRODUCT_DISABLED" }); }),
  mapCountryProductAccessError: vi.fn(() => ({ status: 403, body: { error: "COUNTRY_PRODUCT_DISABLED" } })),
}));
vi.mock("@/lib/db/client", () => ({
  db: { update },
  schema: { bahrainLawyers: {} },
}));

import { PATCH } from "./route";

it("blocks availability changes before updating readiness when LegalSOS is disabled", async () => {
  const response = await PATCH(new Request("https://lawyers.bh/api/lawyers/lawyer-1/status", {
    method: "PATCH",
    body: JSON.stringify({ status: "available" }),
  }), { params: Promise.resolve({ id: "lawyer-1" }) });
  expect(response.status).toBe(403);
  expect(update).not.toHaveBeenCalled();
});
