import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlBoundary = vi.hoisted(() => {
  const boundValues: unknown[][] = [];
  const queryTemplates: string[] = [];

  function sqlClient(
    stringsOrIdentifier: TemplateStringsArray | string,
    ...values: unknown[]
  ) {
    if (typeof stringsOrIdentifier === "string") {
      return stringsOrIdentifier;
    }

    boundValues.push(values);
    queryTemplates.push(stringsOrIdentifier.join("?"));
    return Promise.resolve([]);
  }

  return { boundValues, queryTemplates, sqlClient };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({
  sqlClient: sqlBoundary.sqlClient,
}));

import {
  createDefaultProviderCommissionRates,
  getProviderCommissionRate,
} from "./commission";

describe("commission raw SQL boundary", () => {
  beforeEach(() => {
    sqlBoundary.boundValues.length = 0;
    sqlBoundary.queryTemplates.length = 0;
  });

  it("uses published commission percentages when supplied", async () => {
    await createDefaultProviderCommissionRates({
      providerId: "11111111-1111-4111-8111-111111111111",
      countryCode: "BH",
      commissionRatesTable: "bahrain_provider_commission_rates",
      startsAt: new Date("2026-09-09T00:00:00.000Z"),
      platformPercentageYearOne: 12.5,
      platformPercentageYearTwo: 30,
    });
    const values = sqlBoundary.boundValues.flat();
    expect(values).toContain("12.50");
    expect(values).toContain("87.50");
    expect(values).toContain("30.00");
    expect(values).toContain("70.00");
  });

  it("serializes the commission start date before binding SQL values", async () => {
    await createDefaultProviderCommissionRates({
      providerId: "bb0e6bd8-53ee-4792-951e-7ac4035edc74",
      countryCode: "BH",
      commissionRatesTable: "bahrain_provider_commission_rates",
      startsAt: new Date("2026-08-18T08:07:28.420Z"),
    });

    const values = sqlBoundary.boundValues.flat();

    expect(values).toContain("2026-08-18T08:07:28.420Z");
    expect(values.some((value) => value instanceof Date)).toBe(false);
  });

  it("casts every commission start timestamp before timestamp arithmetic", async () => {
    await createDefaultProviderCommissionRates({
      providerId: "bb0e6bd8-53ee-4792-951e-7ac4035edc74",
      countryCode: "BH",
      commissionRatesTable: "bahrain_provider_commission_rates",
      startsAt: new Date("2026-08-18T08:07:28.420Z"),
    });

    const query = sqlBoundary.queryTemplates.join("\n");
    const timestampCasts = query.match(/::timestamptz/g) ?? [];

    expect(timestampCasts).toHaveLength(3);
  });

  it("creates 20/80 for the first year and 45/55 from the anniversary", async () => {
    await createDefaultProviderCommissionRates({
      providerId: "bb0e6bd8-53ee-4792-951e-7ac4035edc74",
      countryCode: "BH",
      commissionRatesTable: "bahrain_provider_commission_rates",
      startsAt: new Date("2026-09-03T09:30:00.000Z"),
    });

    const values = sqlBoundary.boundValues.flat();
    const query = sqlBoundary.queryTemplates.join("\n");

    expect(values).toContain("20.00");
    expect(values).toContain("80.00");
    expect(values).toContain("45.00");
    expect(values).toContain("55.00");
    expect(query.match(/INTERVAL '1 year'/g)).toHaveLength(2);
  });

  it("preserves existing commission rows by inserting only when no conflict", async () => {
    await createDefaultProviderCommissionRates({
      providerId: "bb0e6bd8-53ee-4792-951e-7ac4035edc74",
      countryCode: "BH",
      commissionRatesTable: "bahrain_provider_commission_rates",
      startsAt: new Date("2026-09-03T09:30:00.000Z"),
    });

    const query = sqlBoundary.queryTemplates.join("\n");
    expect(query).toContain("ON CONFLICT (provider_id, effective_from)");
    expect(query).toContain("DO NOTHING");
  });

  it.each([
    "2027-09-03T09:29:59.999Z",
    "2027-09-03T09:30:00.000Z",
    "2027-09-03T09:30:00.001Z",
  ])("selects a non-overlapping rate at the anniversary boundary %s", async (effectiveAt) => {
    await getProviderCommissionRate({
      providerId: "bb0e6bd8-53ee-4792-951e-7ac4035edc74",
      countryCode: "BH",
      commissionRatesTable: "bahrain_provider_commission_rates",
      effectiveAt: new Date(effectiveAt),
    });

    const query = sqlBoundary.queryTemplates.at(-1) ?? "";
    const values = sqlBoundary.boundValues.at(-1) ?? [];

    expect(query).toContain("effective_from <= ?::timestamptz");
    expect(query).toContain("effective_to > ?::timestamptz");
    expect(values.filter((value) => value === effectiveAt)).toHaveLength(2);
  });
});
