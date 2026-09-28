import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ sqlClient: vi.fn() }));

import { createProviderApplicationsRepository } from "./provider-applications-repository";

describe("provider applications repository", () => {
  it("joins the deployed Bahrain Tap onboarding table", () => {
    const source = readFileSync(
      "lib/admin/provider-applications-repository.ts",
      "utf8",
    );
    expect(source).toContain("LEFT JOIN bahrain_tap_retailer_onboarding");
    expect(source).not.toMatch(/LEFT JOIN tap_retailer_onboarding\b/);
  });

  it("lists Bahrain and Saudi applications with a trusted country scope", async () => {
    const query = vi.fn(async (table: string, code: string) => [
      { id: `${code}-1`, country_code: code, source_table: table },
    ]);
    const repository = createProviderApplicationsRepository({
      loadCountries: async () => [
        { code: "BH", tablePrefix: "bahrain" },
        { code: "SA", tablePrefix: "saudi" },
      ],
      query,
    });

    await expect(repository.list()).resolves.toEqual([
      expect.objectContaining({ id: "BH-1", countryCode: "BH" }),
      expect.objectContaining({ id: "SA-1", countryCode: "SA" }),
    ]);
    expect(query).toHaveBeenNthCalledWith(1, "bahrain_lawyers", "BH");
    expect(query).toHaveBeenNthCalledWith(2, "saudi_lawyers", "SA");
  });

  it("requires a matching active country before resolving an application", async () => {
    const query = vi.fn();
    const repository = createProviderApplicationsRepository({
      loadCountries: async () => [{ code: "BH", tablePrefix: "bahrain" }],
      query,
    });
    await expect(repository.destination("id", "SA")).resolves.toBeNull();
    expect(query).not.toHaveBeenCalled();
  });
});
