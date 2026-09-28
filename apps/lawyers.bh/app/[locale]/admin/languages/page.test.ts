import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("language management admin page", () => {
  it("is restricted to super administrators", () => {
    const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    expect(source).toContain("requireSuperAdmin()");
    expect(source).toContain("redirect(`/${locale}/admin`)");
  });
});
