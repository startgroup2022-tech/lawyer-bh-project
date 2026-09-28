import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("provider customer request terms guard", () => {
  it.each([
    "requests/route.ts",
    "[source]/[id]/route.ts",
  ])("blocks %s while updated terms are pending", async (relative) => {
    const source = await readFile(new URL(relative, import.meta.url), "utf8");
    expect(source).toContain("requireLawyerTermsForRequests");
  });

  it("returns a stable acceptance-required response", async () => {
    const source = await readFile(new URL("_terms-access.ts", import.meta.url), "utf8");
    expect(source).toContain("assertLawyerRequestAccess");
    expect(source).toContain("terms_acceptance_required");
    expect(source).toContain("provider-dashboard/terms");
  });
});
