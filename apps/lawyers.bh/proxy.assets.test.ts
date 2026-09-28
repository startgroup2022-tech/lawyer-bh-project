import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("proxy static asset matcher", () => {
  it("excludes public files from locale routing", () => {
    expect(readFileSync("proxy.ts", "utf8")).toContain(".*\\\\..*");
  });
});
