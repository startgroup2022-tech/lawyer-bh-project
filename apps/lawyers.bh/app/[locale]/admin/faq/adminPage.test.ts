import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("FAQ admin page contract", () => {
  it("protects the page with manage_faq", () => {
    const page = readFileSync("app/[locale]/admin/faq/page.tsx", "utf8");
    expect(page).toContain('requireAdminPermission("manage_faq")');
  });

  it("offers bilingual categories, questions, archive, preview and ordering", () => {
    const content = readFileSync("app/[locale]/admin/faq/FaqAdminContent.tsx", "utf8");
    for (const marker of ["categories", "questions", "archive", "preview", "draggable", "/reorder"]) expect(content).toContain(marker);
    expect(content).toContain("إدارة الأسئلة الشائعة");
    expect(content).toContain("FAQ Management");
  });

  it("gives icon-only actions localized accessible names", () => {
    const content = readFileSync("app/[locale]/admin/faq/FaqAdminContent.tsx", "utf8");
    for (const marker of ["تعديل التصنيف", "نشر التصنيف", "أرشفة التصنيف", "تعديل السؤال", "نشر السؤال", "أرشفة السؤال"]) {
      expect(content).toContain(marker);
    }
  });
});
