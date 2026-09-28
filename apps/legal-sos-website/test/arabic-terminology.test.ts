import { readdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const banned = /(?<![\p{L}\p{N}_])محام(?:ٍ)?(?![\p{L}\p{N}_])/gu;

function sourceFiles(root: string, extensions: Set<string>): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path, extensions);
    return extensions.has(extname(entry.name)) ? [path] : [];
  });
}

describe("Arabic lawyer terminology", () => {
  it("uses محامي in LegalSOS user-facing web and mobile sources", () => {
    const monorepo = resolve(process.cwd(), "../..");
    const files = [
      ...sourceFiles(resolve(process.cwd(), "components"), new Set([".ts", ".tsx"])),
      ...sourceFiles(resolve(process.cwd(), "lib/translations"), new Set([".ts"])),
      resolve(process.cwd(), "lib/terms-content.ts"),
      ...sourceFiles(resolve(monorepo, "../legalsos_app/lib"), new Set([".dart"])),
    ];
    const violations = files.flatMap((file) => {
      const matches = [...readFileSync(file, "utf8").matchAll(banned)];
      return matches.map((match) => `${file}:${match.index}:${match[0]}`);
    });
    expect(violations).toEqual([]);
  });
});
