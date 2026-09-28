import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("lawyer registration terms admin page", () => {
  it("requires the terms and commissions permission", () => {
    expect(read("./page.tsx")).toContain('requireAdminPermission("manage_terms_commissions")');
  });

  it("loads lawyer registration terms and supports lifecycle actions", () => {
    const ui = read("./LawyerTermsAdminContent.tsx");
    for (const marker of ["documentType=lawyer_registration", 'documentType: "lawyer_registration"', 'editingId ? "PATCH" : "POST"', "/publish", 'confirmation: "PUBLISH"', 'action: "archive"', "history", "preview"]) expect(ui).toContain(marker);
  });

  it("edits both languages and derives lawyer shares live", () => {
    const ui = read("./LawyerTermsAdminContent.tsx");
    for (const marker of ["المحتوى بالعربية", "English content", "platformPercentageYearOne", "platformPercentageYearTwo", "lawyerShare", "100 - value", "السنة الأولى", "Year two"]) expect(ui).toContain(marker);
  });

  it("includes feedback, approved borders, and the existing-lawyer acceptance campaign", () => {
    const ui = read("./LawyerTermsAdminContent.tsx");
    for (const marker of ["Loader2", 'tone: "error"', "border-transparent", "hover:border-white"]) expect(ui).toContain(marker);
    expect(ui).not.toContain("AdminLogoutButton");
    expect(ui).not.toContain("AdminHeaderActions");
    expect(ui).toContain("requestAcceptanceCampaign");
    expect(ui).toContain("REQUEST_ACCEPTANCE");
    expect(ui).toContain("إرسال طلب الموافقة للمحامين السابقين");
  });
});
