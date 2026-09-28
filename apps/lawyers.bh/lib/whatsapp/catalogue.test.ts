import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ country: vi.fn(), methods: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ sqlClient: vi.fn() }));
vi.mock("@/lib/publicLawyers", () => ({ getPublicLawyers: vi.fn() }));
vi.mock("@/lib/db/country-tables", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/country-tables")>("@/lib/db/country-tables");
  return { ...actual, getActiveCountry: mocks.country };
});
vi.mock("@/lib/booking/consultationMethodCatalog", () => ({ listConsultationMethods: mocks.methods }));

import { listLiveConsultationMethods } from "./catalogue";

describe("WhatsApp live catalogue", () => {
  beforeEach(() => mocks.country.mockResolvedValue({ code: "BH", currencyCode: "BHD", tablePrefix: "bahrain" }));

  it("maps exact current database price and duration", async () => {
    mocks.methods.mockResolvedValueOnce([{ id: "m1", code: "video", name: { ar: "مرئية", en: "Video" }, price: 91, currencyCode: "BHD", durationMinutes: 47, iconKey: "video", sortOrder: 1 }]);
    await expect(listLiveConsultationMethods("ar")).resolves.toEqual([{ id: "m1", key: "video", name: "مرئية", price: 91, currencyCode: "BHD", durationMinutes: 47 }]);
  });

  it("returns no stale data when Bahrain or the catalogue is unavailable", async () => {
    mocks.country.mockResolvedValueOnce(null);
    await expect(listLiveConsultationMethods("ar")).resolves.toEqual([]);
    mocks.methods.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(listLiveConsultationMethods("ar")).rejects.toThrow("database unavailable");
  });
});
