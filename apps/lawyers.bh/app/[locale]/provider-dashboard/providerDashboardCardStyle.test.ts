import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("provider dashboard card style", () => {
  it("keeps navigation cards shadow-free", () => {
    const source = readFileSync(new URL("./Content.tsx", import.meta.url), "utf8");
    const card = source.match(/key=\{card\.view\}[\s\S]*?focus-visible:ring-primary/)?.[0] || "";
    expect(card).not.toContain("shadow-");
    expect(card).toContain("hover:-translate-y-1");
    expect(card).toContain("border-gray-200");
    expect(source).toContain('<section className="grid gap-5 pt-2 sm:grid-cols-2 lg:grid-cols-3">');
  });
});
