import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "app/[locale]/provider-dashboard");

describe("provider dashboard routes", () => {
  it.each([
    ["page.tsx", "home"],
    ["requests/page.tsx", "requests"],
    ["balances/page.tsx", "balances"],
    ["profile/page.tsx", "profile"],
  ])("pins %s to the %s view", (path, view) => {
    const source = readFileSync(join(root, path), "utf8");
    expect(source).toContain(`<Content view="${view}" />`);
    expect(source).toContain("generateMetadata");
  });
});
