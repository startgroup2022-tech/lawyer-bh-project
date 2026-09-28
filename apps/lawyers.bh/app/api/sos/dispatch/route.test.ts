import { expect, it, vi } from "vitest";

const sideEffects = vi.hoisted(() => ({ sql: vi.fn(), update: vi.fn() }));

vi.mock("@/lib/countries/product-access", () => ({
  requireCountryProduct: vi.fn(async () => {
    throw Object.assign(new Error("COUNTRY_PRODUCT_DISABLED"), {
      code: "COUNTRY_PRODUCT_DISABLED",
    });
  }),
  mapCountryProductAccessError: vi.fn((error: { code?: string }) =>
    error?.code === "COUNTRY_PRODUCT_DISABLED"
      ? { status: 403, body: { error: "COUNTRY_PRODUCT_DISABLED" } }
      : null,
  ),
}));
vi.mock("@/lib/db/client", () => ({
  sqlClient: Object.assign(sideEffects.sql, { json: vi.fn() }),
  db: { update: sideEffects.update },
  schema: { consentLog: { id: "id" } },
}));
vi.mock("@/lib/db/country-tables", () => ({ buildCountryTableSet: vi.fn() }));
vi.mock("@/lib/sos/emergencyCaseCatalog", () => ({ findEmergencyCaseType: vi.fn() }));
vi.mock("@/lib/sos/consentText", () => ({ hashConsentText: vi.fn() }));
vi.mock("@/lib/sos/pdfRenderer", () => ({ renderSosConsentPdf: vi.fn() }));

import { POST } from "./route";

it("blocks a new SOS dispatch before persistence when LegalSOS is disabled", async () => {
  const response = await POST(new Request("https://lawyers.bh/api/sos/dispatch", {
    method: "POST",
    body: JSON.stringify({ countryCode: "SA" }),
  }));

  expect(response.status).toBe(403);
  await expect(response.json()).resolves.toEqual({ error: "COUNTRY_PRODUCT_DISABLED" });
  expect(sideEffects.sql).not.toHaveBeenCalled();
  expect(sideEffects.update).not.toHaveBeenCalled();
});
