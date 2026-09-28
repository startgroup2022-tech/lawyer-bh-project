import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("consultation types admin page", () => {
  it("protects and exposes all management actions", () => {
    expect(read("./page.tsx")).toContain('requireAdminPermission("manage_consultation_types")');
    const ui = read("./ConsultationTypesContent.tsx");
    for (const value of ["إضافة نوع استشارة", "archive", "restore", "DELETE", "hover:border-white"]) expect(ui).toContain(value);
  });

  it("scopes catalogues to the selected country and uses the visual icon picker", () => {
    const ui = read("./ConsultationTypesContent.tsx");
    expect(ui).toContain("/api/admin/consultation-types/countries");
    expect(ui).toContain("encodeURIComponent(countryCode)");
    expect(ui).toContain("ConsultationIconPicker");
    expect(ui).toContain("countryCode })");
  });
});
