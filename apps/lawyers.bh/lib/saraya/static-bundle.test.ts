import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Saraya static bundle", () => {
  it("loads Flutter assets from the public saraya path", () => {
    const html = readFileSync("public/saraya/index.html", "utf8");
    const version = JSON.parse(
      readFileSync("public/saraya/version.json", "utf8"),
    );

    expect(html).toContain('<base href="/saraya/">');
    expect(html).toContain("saraya-square-phase1");
    expect(version).toMatchObject({ app_name: "saraya_square_app" });
  });
});
