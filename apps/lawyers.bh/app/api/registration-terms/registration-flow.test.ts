import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("published lawyer terms registration flow", () => {
  it("renders and submits the exact published version", async () => {
    const page = await readFile(new URL("../../[locale]/join/page.tsx", import.meta.url), "utf8");
    const content = await readFile(new URL("../../[locale]/join/Content.tsx", import.meta.url), "utf8");
    expect(page).toContain('getPublishedTerms("lawyer_registration")');
    expect(content).toContain('fd.set("termsVersionId", registrationTerms.id)');
  });

  it("validates and records the accepted version on web registration", async () => {
    const route = await readFile(new URL("../join/route.ts", import.meta.url), "utf8");
    expect(route).toContain("AGREEMENT_STALE");
    expect(route).toContain("lawyer_terms_acceptances");
  });
});
