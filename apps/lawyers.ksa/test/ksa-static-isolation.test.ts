import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const roots = ["app", "components", "lib"];
const forbidden = [
  /public\.bahrain_(lawyers|booking_requests|emergency_requests|tap_retailer_onboarding)/,
  /\|\|\s*["']BH["']/,
  /currency\s*:\s*["']BHD["']/,
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (![".ts", ".tsx"].includes(extname(entry.name))) return [];
    if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) return [];
    return [path];
  });
}

describe("Lawyers KSA executable isolation", () => {
  it("contains no Bahrain business-table or BHD runtime defaults", () => {
    const violations = roots
      .flatMap(sourceFiles)
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        return forbidden
          .filter((pattern) => pattern.test(source))
          .map((pattern) => `${relative(process.cwd(), file)}: ${pattern}`);
      });

    expect(violations).toEqual([]);
  });
});
