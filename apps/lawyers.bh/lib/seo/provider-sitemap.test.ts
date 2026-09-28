import { describe, expect, it } from "vitest";
import { buildProviderSitemapEntries } from "./provider-sitemap";

describe("provider sitemap", () => {
  it("creates bilingual profile entries with public images", () => {
    const entries = buildProviderSitemapEntries([{ slug: "fatima-ali", image: "/images/lawyers/fatima.jpg", updatedAt: "2026-09-05T00:00:00Z" }]);
    expect(entries).toHaveLength(2);
    expect(entries[0].url).toBe("https://www.lawyers.bh/ar/directory/fatima-ali");
    expect(entries[0].images).toEqual(["https://www.lawyers.bh/images/lawyers/fatima.jpg"]);
    expect(entries[0].alternates?.languages?.en).toBe("https://www.lawyers.bh/en/directory/fatima-ali");
  });
  it("omits private embedded images", () => {
    expect(buildProviderSitemapEntries([{ slug: "a", image: "data:image/png;base64,x" }])[0].images).toBeUndefined();
  });
});
