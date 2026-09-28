import { beforeEach, expect, it, vi } from "vitest";

const access = vi.hoisted(() => vi.fn());
vi.mock("@/lib/countries/product-access", () => ({
  requireCountryProduct: access,
  mapCountryProductAccessError: vi.fn(() => ({
    status: 403,
    body: { error: "COUNTRY_PRODUCT_DISABLED" },
  })),
}));
vi.mock("@/lib/db/client", () => ({ sqlClient: vi.fn() }));
vi.mock("@/lib/db/country-tables", () => ({ buildCountryTableSet: vi.fn() }));
vi.mock("@/lib/tap", () => ({ siteOrigin: vi.fn() }));
vi.mock("@/lib/postmark", () => ({ isEmail: vi.fn(), str: vi.fn() }));
vi.mock("@/lib/booking/consultationMethodCatalog", () => ({ findConsultationMethod: vi.fn() }));
vi.mock("@/lib/tap/config", () => ({ getTapMode: vi.fn() }));
vi.mock("@/lib/sos/caseTypes", () => ({ getCaseTypeBySlug: vi.fn() }));
vi.mock("@/lib/discounts/repository", () => ({ attachDiscountToCharge: vi.fn(), loadDiscountQuote: vi.fn(), reserveDiscount: vi.fn() }));
vi.mock("@/lib/discounts/pricing", () => ({ parseBhdToFils: vi.fn() }));
vi.mock("@/lib/discounts/service", () => ({ DiscountError: class DiscountError extends Error {} }));
vi.mock("@/lib/payments/charge-routing", () => ({ getChargeRecipient: vi.fn() }));

import { POST } from "./route";

beforeEach(() => {
  access.mockReset();
  access.mockRejectedValue(new Error("COUNTRY_PRODUCT_DISABLED"));
});

it.each([
  ["book_appointment", "lawyers"],
  ["sos", "legal_sos"],
] as const)("gates %s charge with %s before Tap work", async (paymentFlow, product) => {
  const response = await POST(new Request("https://lawyers.bh/api/tap/charge", {
    method: "POST",
    body: JSON.stringify({ countryCode: "SA", paymentFlow }),
  }));

  expect(response.status).toBe(403);
  expect(access).toHaveBeenCalledWith("SA", product);
});
