import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");
describe("About admin page", () => {
  it("uses dedicated permission and approved card styling", () => {
    expect(read("./page.tsx")).toContain('requireAdminPermission("manage_about")');
    const content = read("./AboutAdminContent.tsx");
    expect(content).toContain("border-transparent");
    expect(content).toContain("hover:border-[#B4232A]");
    expect(content).toContain("إدارة صفحة من نحن");
    expect(content).toContain("حذف نهائي");
  });
});
