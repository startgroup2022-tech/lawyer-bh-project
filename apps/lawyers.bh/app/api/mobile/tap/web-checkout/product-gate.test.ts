import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sql: vi.fn(), charge: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ sqlClient: mocks.sql }));
vi.mock("@/lib/tap/mobile-request-access", () => ({ verifyMobileRequestAccessToken: vi.fn(() => true) }));
vi.mock("@/lib/tap/client", () => ({ createTapClient: vi.fn(() => ({ createCharge: mocks.charge })) }));
vi.mock("@/lib/countries/product-access", () => ({
  requireCountryProduct: vi.fn(async () => { throw Object.assign(new Error("COUNTRY_PRODUCT_DISABLED"), { code: "COUNTRY_PRODUCT_DISABLED" }); }),
  mapCountryProductAccessError: vi.fn(() => ({ status: 403, body: { error: "COUNTRY_PRODUCT_DISABLED" } })),
}));

import { POST } from "./route";

it("blocks web checkout before updating the booking or calling Tap", async () => {
  mocks.sql.mockResolvedValueOnce([{
    id: "11111111-1111-4111-8111-111111111111", country_code: "BH",
    mobile_request_access_digest: "digest", payment_status: "pending",
    service_status: "pending", tap_charge_id: null, tap_status: null,
  }]);
  const response = await POST(new Request("https://lawyers.bh/api/mobile/tap/web-checkout", {
    method: "POST",
    headers: { authorization: "Bearer access" },
    body: JSON.stringify({ bookingId: "11111111-1111-4111-8111-111111111111" }),
  }));
  expect(response.status).toBe(403);
  expect(mocks.sql).toHaveBeenCalledTimes(1);
  expect(mocks.charge).not.toHaveBeenCalled();
});
