import { describe, expect, it } from "vitest";
import { buildSiteGraph } from "./site-graph";

describe("site graph", () => {
  it("links the organization and website on the canonical origin", () => {
    const value = JSON.stringify(buildSiteGraph("ar"));
    expect(value).toContain('"@type":"Organization"');
    expect(value).toContain('"@type":"WebSite"');
    expect(value).toContain("https://www.lawyers.bh/#organization");
    expect(value).toContain("منصة محامون البحرين");
  });
});
