import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sql: vi.fn(), charge: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ sqlClient: mocks.sql }));
vi.mock("@/lib/tap/mobile-request-access", () => ({ verifyMobileRequestAccessToken: vi.fn(() => true) }));
vi.mock("@/lib/tap/client", () => ({ createTapClient: vi.fn(() => ({ createCharge: mocks.charge })) }));
vi.mock("@/lib/countries/product-access", () => ({
  requireCountryProduct: vi.fn(async () => { throw Object.assign(new Error("COUNTRY_PRODUCT_DISABLED"), { code: "COUNTRY_PRODUCT_DISABLED" }); }),
  mapCountryProductAccessError: vi.fn(() => ({ status: 403, body: { error: "COUNTRY_PRODUCT_DISABLED" } })),
}));

import { POST } from "./route";

beforeEach(() => {
  vi.stubEnv("TAP_MOBILE_TEST_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("TAP_MOBILE_TEST_PUBLIC_KEY", "pk_test_fixture");
  vi.stubEnv("TAP_MOBILE_TEST_MERCHANT_ID", "123456");
  mocks.sql.mockReset().mockResolvedValueOnce([{
    id: "11111111-1111-4111-8111-111111111111", country_code: "BH",
    mobile_request_access_digest: "digest", payment_status: "pending",
    service_status: "pending", tap_charge_id: null, tap_status: null,
  }]);
  mocks.charge.mockReset();
});

it("blocks a web-card charge before claiming the booking or calling Tap", async () => {
  const response = await POST(new Request("https://lawyers.bh/api/mobile/tap/web-card", {
    method: "POST",
    headers: { authorization: "Bearer access" },
    body: JSON.stringify({ bookingId: "11111111-1111-4111-8111-111111111111", tokenId: "tok_test", phoneDialCode: "973" }),
  }));
  expect(response.status).toBe(403);
  expect(mocks.sql).toHaveBeenCalledTimes(1);
  expect(mocks.charge).not.toHaveBeenCalled();
});
