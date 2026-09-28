import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const adminRoot = new URL(".", import.meta.url).pathname;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (name === "node_modules") return [];
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("admin shell coverage", () => {
  it("keeps logout ownership in the shared route header", () => {
    const duplicateOwners = sourceFiles(adminRoot).filter((path) =>
      readFileSync(path, "utf8").includes("AdminLogoutButton"),
    );
    expect(duplicateOwners).toEqual([]);
  });

  it("keeps every admin page under the shared layout", () => {
    const pages = sourceFiles(adminRoot).filter((path) => path.endsWith("page.tsx"));
    expect(pages.length).toBeGreaterThan(15);
    expect(readFileSync(join(adminRoot, "layout.tsx"), "utf8")).toContain("AdminRouteHeader");
  });
});
