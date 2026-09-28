import { describe, expect, it } from "vitest";
import { buildLawyerImportRow, resolveLawyerImportHeaders, summarizeLawyerImport, validateLawyerImportRow } from "./lawyer-import";

describe("lawyer Excel import", () => {
  it("accepts Arabic headers and keeps English name optional", () => {
    const indexes = resolveLawyerImportHeaders(["الاسم بالعربي", "رقم الهاتف", "البريد الإلكتروني"]);
    expect(indexes).not.toBeNull();
    expect(buildLawyerImportRow(2, [" حبيب محمد ", "36005682", "H@EXAMPLE.COM"], indexes!)).toMatchObject({ fullNameAr: "حبيب محمد", fullNameEn: "", email: "h@example.com" });
  });

  it("rejects missing required headers and invalid rows", () => {
    expect(resolveLawyerImportHeaders(["الاسم بالعربي", "البريد الإلكتروني"])).toBeNull();
    expect(validateLawyerImportRow({ rowNumber: 2, fullNameAr: "حبيب", fullNameEn: "", phone: "", email: "bad" })).toBe("رقم الهاتف مطلوب");
  });

  it("summarizes partial results", () => {
    expect(summarizeLawyerImport([
      { rowNumber: 2, fullNameAr: "أ", fullNameEn: "", phone: "1", email: "a@x.com", status: "success" },
      { rowNumber: 3, fullNameAr: "ب", fullNameEn: "", phone: "2", email: "b@x.com", status: "skipped" },
      { rowNumber: 4, fullNameAr: "ج", fullNameEn: "", phone: "3", email: "c@x.com", status: "failed" },
    ])).toEqual({ success: 1, skipped: 1, failed: 1 });
  });
});
