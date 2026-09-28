import { expect, it, vi } from "vitest";

const update = vi.hoisted(() => vi.fn());
vi.mock("@/lib/sos/lawyerAuth", () => ({
  requireAdvocate: vi.fn(async () => ({ ok: true, advocate: { id: "lawyer-1", countryCode: "BH" } })),
}));
vi.mock("@/lib/countries/product-access", () => ({
  requireCountryProduct: vi.fn(async () => { throw Object.assign(new Error("COUNTRY_PRODUCT_DISABLED"), { code: "COUNTRY_PRODUCT_DISABLED" }); }),
  mapCountryProductAccessError: vi.fn(() => ({ status: 403, body: { error: "COUNTRY_PRODUCT_DISABLED" } })),
}));
vi.mock("@/lib/db/client", () => ({
  db: { update },
  schema: { bahrainLawyers: {} },
}));

import { POST } from "./route";

it("blocks going online before updating readiness when LegalSOS is disabled", async () => {
  const response = await POST(new Request("https://lawyers.bh/api/sos/lawyer/online", {
    method: "POST",
    body: JSON.stringify({ isEmergencyReady: true, locationSharingEnabled: true }),
  }));
  expect(response.status).toBe(403);
  expect(update).not.toHaveBeenCalled();
});
