import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rows: [] as unknown[],
  sql: vi.fn((x: TemplateStringsArray | string) =>
    typeof x === "string" ? x : Promise.resolve(mocks.rows),
  ),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({
  sqlClient: mocks.sql,
}));

import { findConsultationMethod, listConsultationMethods } from "./consultationMethodCatalog";

const country = {
  code: "BH",
  tablePrefix: "bahrain",
  nameAr: "",
  nameEn: "",
  currencyCode: "BHD",
  defaultLocale: "ar",
};

describe("dynamic consultation catalogue", () => {
  beforeEach(() => {
    mocks.rows = [];
  });

  it("returns a valid custom active method", async () => {
    mocks.rows = [
      {
        id: "1",
        code: "home-visit",
        name_ar: "زيارة منزلية",
        name_en: "Home visit",
        price: "50.000",
        currency_code: "BHD",
        duration_minutes: 30,
        icon_key: "home",
        sort_order: 5,
      },
    ];

    expect(await listConsultationMethods(country)).toMatchObject([
      { code: "home-visit", price: 50 },
    ]);
    expect(await findConsultationMethod(country, "home-visit")).toMatchObject({ code: "home-visit" });
  });

  it("keeps virtual guidance records with zero price and zero minutes", async () => {
    mocks.rows = [
      {
        id: "2",
        code: "online",
        name_ar: "إرشاد قانوني مجاني",
        name_en: "Free Legal Guidance",
        price: "0.000",
        currency_code: "BHD",
        duration_minutes: 0,
        icon_key: "message-circle",
        sort_order: 1,
      },
    ];

    expect(await listConsultationMethods(country)).toMatchObject([
      { code: "online", price: 0 },
    ]);
  });

  it("rejects malformed codes before querying", async () => {
    expect(await findConsultationMethod(country, "../bad")).toBeNull();
  });
});
