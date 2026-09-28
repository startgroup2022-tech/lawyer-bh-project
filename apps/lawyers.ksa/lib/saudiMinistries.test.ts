import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { saudiMinistries } from "./saudiMinistries";

describe("saudiMinistries", () => {
  it("provides all 24 Saudi ministries with unique official links", () => {
    expect(saudiMinistries).toHaveLength(24);
    expect(new Set(saudiMinistries.map(({ key }) => key)).size).toBe(24);
    expect(new Set(saudiMinistries.map(({ url }) => url)).size).toBe(24);

    for (const ministry of saudiMinistries) {
      expect(ministry.ar).toMatch(/^وزارة /);
      expect(ministry.en).toMatch(/^Ministry of /);
      expect(ministry.logo).toMatch(
        /^\/images\/government\/saudi\/.+\.(svg|png|webp)$/,
      );
      expect(ministry.url).toMatch(/^https:\/\//);
      expect(ministry.url).not.toMatch(/\.bh(?:\/|$)/);
    }
  });

  it("ships every referenced logo locally", async () => {
    for (const ministry of saudiMinistries) {
      const logoUrl = new URL(`../public${ministry.logo}`, import.meta.url);

      await expect(access(fileURLToPath(logoUrl))).resolves.toBeUndefined();
    }
  });
});
