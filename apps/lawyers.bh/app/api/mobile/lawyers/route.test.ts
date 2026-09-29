import { beforeEach, describe, expect, it, vi } from "vitest";

const { HABIB_ID, OTHER_REVIEW_ID } = vi.hoisted(() => ({
  HABIB_ID: "3ee97030-bc1a-47c1-b06c-bd2b1acee637",
  OTHER_REVIEW_ID: "b0d7235b-ef7f-4fe0-b419-cd74517b6d64",
}));
const access = vi.hoisted(() => ({ enabled: true }));

vi.mock("@/lib/countries/product-access", () => ({
  requireCountryProduct: vi.fn(async () => {
    if (!access.enabled) throw Object.assign(new Error("COUNTRY_PRODUCT_DISABLED"), { code: "COUNTRY_PRODUCT_DISABLED" });
    return { code: "BH" };
  }),
  mapCountryProductAccessError: vi.fn((error: { code?: string }) => error?.code === "COUNTRY_PRODUCT_DISABLED"
    ? { status: 403, body: { error: "COUNTRY_PRODUCT_DISABLED" } }
    : null),
}));

// The route now reuses the public directory query, so the mock supplies its
// already-mapped rows instead of a drizzle chain.
const directory = vi.hoisted(() => ({
  lawyers: [] as Array<Record<string, unknown>>,
}));
vi.mock("@/lib/publicLawyers", () => ({
  getPublicLawyers: vi.fn(async () => directory.lawyers),
}));

function publicLawyer(overrides: Record<string, unknown>) {
  return {
    id: "real",
    countryCode: "BH",
    slug: "real-lawyer",
    subscriptionType: "lawyer",
    subscriptionTypes: ["lawyer"],
    nameAr: "محام حقيقي",
    nameEn: "Real Lawyer",
    subtitleAr: "محامٍ",
    subtitleEn: "Lawyer",
    registrationNo: "REG-1",
    membershipNo: null,
    registrationLevel: null,
    experienceYears: 0,
    language: "",
    workingHours: "",
    specialtyMain: "",
    specialtySubs: [],
    specialties: [],
    image: null,
    badgeType: "registered",
    rating: 0,
    reviewCount: 0,
    reviewComments: [],
    licenseExpiryDate: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    phone: "1",
    email: "real@example.com",
    status: "approved",
    isReviewAccount: false,
    ...overrides,
  };
}

const mappedReal = {
  id: "real", countryCode: "BH", fullNameAr: "محام حقيقي", fullNameEn: "Real Lawyer",
  phone: "1", email: "real@example.com", status: "approved", subscriptionType: "lawyer",
  subscriptionTypes: ["lawyer"], profileImageUrl: null, professionalTitleAr: "محامٍ",
  professionalTitleEn: "Lawyer", experienceYears: 0, specialtyMain: "", specialtySubs: [],
  specialties: [], languages: "", workingHours: "", registrationNo: "REG-1",
  registrationLevel: null, rating: 0, reviewCount: 0,
};

const mappedHabib = {
  ...mappedReal,
  id: HABIB_ID, fullNameAr: "حبيب محمد", fullNameEn: "Habib Mohammed",
  phone: "+97336005682", email: "habib20298@gmail.com",
};

import { GET } from "./route";

describe("mobile lawyer directory", () => {
  beforeEach(() => {
    access.enabled = true;
    directory.lawyers = [
      publicLawyer({}),
      publicLawyer({
        id: HABIB_ID, nameAr: "حبيب محمد", nameEn: "Habib Mohammed",
        phone: "+97336005682", email: "habib20298@gmail.com",
      }),
      publicLawyer({
        id: OTHER_REVIEW_ID, nameAr: "مراجعة أخرى", nameEn: "Other Review",
        phone: "3", email: "other-review@example.com", isReviewAccount: true,
      }),
    ];
  });

  it("blocks the current directory when the Lawyers Platform is disabled", async () => {
    access.enabled = false;
    const response = await GET(new Request("https://lawyers.bh/api/mobile/lawyers?countryCode=BH"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "COUNTRY_PRODUCT_DISABLED" });
  });

  it("returns Habib as a normal lawyer without an allowlist", async () => {
    const response = await GET(new Request("https://lawyers.bh/api/mobile/lawyers?countryCode=BH"));
    const body = await response.json();
    expect(body.data).toEqual([mappedReal, mappedHabib]);
  });

  it("never exposes review accounts", async () => {
    const response = await GET(
      new Request("https://lawyers.bh/api/mobile/lawyers?countryCode=BH"),
    );
    const body = await response.json();

    expect(body.data).toEqual([mappedReal, mappedHabib]);
    expect(body.data).not.toContainEqual(
      expect.objectContaining({ id: OTHER_REVIEW_ID }),
    );
    expect(body.data).not.toContainEqual(
      expect.objectContaining({ isReviewAccount: expect.anything() }),
    );
  });

  it("publishes the profile fields the app renders, without internal flags", async () => {
    directory.lawyers = [
      publicLawyer({
        image: "https://cdn.example.com/a.jpg",
        subtitleAr: "محامٍ بالتمييز",
        experienceYears: 14,
        specialtyMain: "commercial",
        specialtySubs: ["labor"],
        specialties: ["commercial", "labor"],
        language: "ar,en",
        workingHours: "9-5",
        rating: 4.5,
        reviewCount: 12,
      }),
    ];
    const response = await GET(new Request("https://lawyers.bh/api/mobile/lawyers?countryCode=BH"));
    const body = await response.json();

    expect(body.data[0]).toMatchObject({
      profileImageUrl: "https://cdn.example.com/a.jpg",
      professionalTitleAr: "محامٍ بالتمييز",
      experienceYears: 14,
      specialtyMain: "commercial",
      specialties: ["commercial", "labor"],
      rating: 4.5,
      reviewCount: 12,
    });
    // The review-account flag stays server-side.
    expect(body.data[0]).not.toHaveProperty("isReviewAccount");
    expect(body.data[0]).not.toHaveProperty("slug");
  });
});
