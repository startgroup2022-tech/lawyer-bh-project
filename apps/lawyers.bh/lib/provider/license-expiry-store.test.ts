import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("license expiry store", () => {
  it("writes the canonical suspended status when a license expires", () => {
    const source = readFileSync("lib/provider/license-expiry-store.ts", "utf8");

    expect(source).toMatch(/SET[\s\S]+status\s*=\s*'suspended',[\s\S]+is_active\s*=\s*false/);
  });
});
