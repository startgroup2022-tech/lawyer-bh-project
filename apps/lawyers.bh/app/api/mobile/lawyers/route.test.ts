import { beforeEach, describe, expect, it, vi } from "vitest";

const { HABIB_ID, OTHER_REVIEW_ID } = vi.hoisted(() => ({
  HABIB_ID: "3ee97030-bc1a-47c1-b06c-bd2b1acee637",
  OTHER_REVIEW_ID: "b0d7235b-ef7f-4fe0-b419-cd74517b6d64",
}));
const access = vi.hoisted(() => ({ enabled: true }));

vi.mock("@/lib/db/country-tables", () => ({
  getActiveCountry: vi.fn(async () => ({ code: "BH" })),
}));
vi.mock("@/lib/countries/product-access", () => ({
  requireCountryProduct: vi.fn(async () => {
    if (!access.enabled) throw Object.assign(new Error("COUNTRY_PRODUCT_DISABLED"), { code: "COUNTRY_PRODUCT_DISABLED" });
    return { code: "BH" };
  }),
  mapCountryProductAccessError: vi.fn((error: { code?: string }) => error?.code === "COUNTRY_PRODUCT_DISABLED"
    ? { status: 403, body: { error: "COUNTRY_PRODUCT_DISABLED" } }
    : null),
}));

vi.mock("@/lib/db/client", () => {
  const rows = [
    { id: "real", countryCode: "BH", fullNameAr: "محام حقيقي", fullNameEn: "Real Lawyer", phone: "1", email: "real@example.com", status: "approved", subscriptionType: "lawyer", isReviewAccount: false },
    { id: HABIB_ID, countryCode: "BH", fullNameAr: "حبيب محمد", fullNameEn: "Habib Mohammed", phone: "+97336005682", email: "habib20298@gmail.com", status: "approved", subscriptionType: "lawyer", isReviewAccount: false },
    { id: OTHER_REVIEW_ID, countryCode: "BH", fullNameAr: "مراجعة أخرى", fullNameEn: "Other Review", phone: "3", email: "other-review@example.com", status: "approved", subscriptionType: "lawyer", isReviewAccount: true },
  ];
  const query = { from: vi.fn(), where: vi.fn(async () => rows) };
  query.from.mockReturnValue(query);
  return {
    db: { select: vi.fn(() => query) },
    schema: { bahrainLawyers: {
      id: "id", countryCode: "countryCode", fullNameAr: "fullNameAr",
      fullNameEn: "fullNameEn", phone: "phone", email: "email", status: "status",
      subscriptionType: "subscriptionType", isActive: "isActive",
      isReviewAccount: "isReviewAccount",
    } },
  };
});

import { GET } from "./route";

describe("mobile lawyer directory", () => {
  beforeEach(() => { access.enabled = true; });
  it("blocks the current directory when the Lawyers Platform is disabled", async () => {
    access.enabled = false;
    const response = await GET(new Request("https://lawyers.bh/api/mobile/lawyers?countryCode=BH"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "COUNTRY_PRODUCT_DISABLED" });
  });
  it("returns Habib as a normal lawyer without an allowlist", async () => {
    const response = await GET(new Request("https://lawyers.bh/api/mobile/lawyers?countryCode=BH"));
    const body = await response.json();
    expect(body.data).toEqual([
      { id: "real", countryCode: "BH", fullNameAr: "محام حقيقي", fullNameEn: "Real Lawyer", phone: "1", email: "real@example.com", status: "approved", subscriptionType: "lawyer" },
      { id: HABIB_ID, countryCode: "BH", fullNameAr: "حبيب محمد", fullNameEn: "Habib Mohammed", phone: "+97336005682", email: "habib20298@gmail.com", status: "approved", subscriptionType: "lawyer" },
    ]);
  });

  it("never exposes review accounts", async () => {
    const response = await GET(
      new Request("https://lawyers.bh/api/mobile/lawyers?countryCode=BH"),
    );
    const body = await response.json();

    expect(body.data).toEqual([
      { id: "real", countryCode: "BH", fullNameAr: "محام حقيقي", fullNameEn: "Real Lawyer", phone: "1", email: "real@example.com", status: "approved", subscriptionType: "lawyer" },
      { id: HABIB_ID, countryCode: "BH", fullNameAr: "حبيب محمد", fullNameEn: "Habib Mohammed", phone: "+97336005682", email: "habib20298@gmail.com", status: "approved", subscriptionType: "lawyer" },
    ]);
    expect(body.data).not.toContainEqual(
      expect.objectContaining({ id: OTHER_REVIEW_ID }),
    );
    expect(body.data).not.toContainEqual(
      expect.objectContaining({ isReviewAccount: expect.anything() }),
    );
  });
});
