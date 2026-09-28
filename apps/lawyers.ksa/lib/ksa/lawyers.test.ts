import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  identifiers: [] as string[],
  getKsaContext: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({
  sqlClient: (input: string | TemplateStringsArray) => {
    if (typeof input === "string") {
      dependencies.identifiers.push(input);
      return { identifier: input };
    }
    return Promise.resolve(dependencies.rows);
  },
}));
vi.mock("./context", () => ({
  getKsaContext: dependencies.getKsaContext,
}));

import { findKsaLawyerByRegistration, listActiveKsaLawyers } from "./lawyers";

describe("Saudi lawyer repository", () => {
  beforeEach(() => {
    dependencies.rows = [];
    dependencies.identifiers = [];
    dependencies.getKsaContext.mockReset().mockResolvedValue({
      country: { code: "SA", currencyCode: "SAR" },
      tables: { lawyers: "saudi_lawyers" },
    });
  });

  it("returns a Saudi lawyer login record from the Saudi table", async () => {
    dependencies.rows = [{
      id: "lawyer-1",
      country_code: "SA",
      registration_no: "12345",
      password_hash: "hash",
      status: "approved",
      is_active: true,
      is_emergency_ready: false,
      phone: "+966500000000",
    }];

    await expect(findKsaLawyerByRegistration("12345")).resolves.toEqual({
      id: "lawyer-1",
      countryCode: "SA",
      registrationNo: "12345",
      passwordHash: "hash",
      status: "approved",
      isActive: true,
      isEmergencyReady: false,
      phone: "+966500000000",
    });
    expect(dependencies.identifiers).toEqual(["saudi_lawyers"]);
  });

  it("returns null when the Saudi registration number does not exist", async () => {
    await expect(findKsaLawyerByRegistration("missing")).resolves.toBeNull();
  });

  it("lists active Saudi lawyers from the Saudi table", async () => {
    dependencies.rows = [{
      id: "lawyer-2",
      country_code: "SA",
      full_name_ar: "محامي سعودي",
      full_name_en: "Saudi Lawyer",
      phone: "+966511111111",
      email: "lawyer@example.sa",
      status: "approved",
      subscription_type: "lawyer",
    }];

    await expect(listActiveKsaLawyers()).resolves.toEqual([{
      id: "lawyer-2",
      countryCode: "SA",
      fullNameAr: "محامي سعودي",
      fullNameEn: "Saudi Lawyer",
      phone: "+966511111111",
      email: "lawyer@example.sa",
      status: "approved",
      subscriptionType: "lawyer",
    }]);
    expect(dependencies.identifiers).toEqual(["saudi_lawyers"]);
  });
});
