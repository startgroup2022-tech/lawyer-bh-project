import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
describe("About admin routes", () => {
  it("protects collection and destructive routes", () => {
    for (const path of ["./route.ts", "./sections/route.ts", "./sections/[id]/route.ts", "./members/route.ts", "./members/[id]/route.ts"]) {
      expect(read(path)).toContain('requireAdminPermission("manage_about")');
    }
    expect(read("./sections/[id]/route.ts")).toContain('confirmation !== "DELETE"');
  });
});
