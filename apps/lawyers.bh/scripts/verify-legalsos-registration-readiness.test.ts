import { describe, expect, it } from "vitest";

import {
  describeDatabaseError,
  evaluateReadiness,
} from "./verify-legalsos-registration-readiness.mjs";

const readyCountries = [
  {
    code: "BH",
    tablePrefix: "bahrain",
    isActive: true,
    tablesProvisioned: true,
    appEnabled: true,
    websiteEnabled: true,
    lawyerTableExists: true,
  },
  {
    code: "SA",
    tablePrefix: "saudi",
    isActive: true,
    tablesProvisioned: true,
    appEnabled: true,
    websiteEnabled: true,
    lawyerTableExists: true,
  },
] as const;

describe("LegalSOS registration readiness", () => {
  it("accepts fully enabled Bahrain and Saudi registration infrastructure", () => {
    expect(evaluateReadiness(readyCountries)).toEqual({
      ok: true,
      countries: ["BH", "SA"],
    });
  });

  it.each([
    ["inactive country", { isActive: false }, "COUNTRY_INACTIVE"],
    ["unprovisioned tables", { tablesProvisioned: false }, "TABLES_UNPROVISIONED"],
    ["disabled app channel", { appEnabled: false }, "APP_CHANNEL_DISABLED"],
    ["disabled website channel", { websiteEnabled: false }, "WEBSITE_CHANNEL_DISABLED"],
    ["missing lawyer table", { lawyerTableExists: false }, "LAWYER_TABLE_MISSING"],
  ])("rejects %s", (_label, patch, reason) => {
    const countries = readyCountries.map((country) =>
      country.code === "SA" ? { ...country, ...patch } : country,
    );

    expect(evaluateReadiness(countries)).toEqual({
      ok: false,
      code: "COUNTRY_NOT_READY",
      country: "SA",
      reason,
    });
  });

  it("rejects a country prefix that could route to another country's table", () => {
    const countries = readyCountries.map((country) =>
      country.code === "SA"
        ? { ...country, tablePrefix: "bahrain" }
        : country,
    );

    expect(evaluateReadiness(countries)).toEqual({
      ok: false,
      code: "COUNTRY_TABLE_MISMATCH",
      country: "SA",
      expectedTable: "saudi_lawyers",
      actualTable: "bahrain_lawyers",
    });
  });

  it("rejects a missing required country", () => {
    expect(evaluateReadiness(readyCountries.filter(({ code }) => code === "BH"))).toEqual({
      ok: false,
      code: "COUNTRY_MISSING",
      country: "SA",
    });
  });

  it("reports a Neon quota failure without exposing connection details", () => {
    expect(
      describeDatabaseError({
        code: "53000",
        message: "Your account or project has exceeded the quota",
        connection: "postgresql://secret",
      }),
    ).toEqual({
      ok: false,
      code: "DATABASE_QUOTA_EXCEEDED",
    });
  });
});
