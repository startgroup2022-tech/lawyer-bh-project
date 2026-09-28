import { describe, expect, it } from "vitest";
import { parseTermsDraftInput } from "./validation";

const lawyerInput = {
  contentAr: "شروط التسجيل",
  contentEn: "Registration terms",
  platformPercentageYearOne: "20.00",
  platformPercentageYearTwo: "45.00",
};

describe("parseTermsDraftInput", () => {
  it.each(["legalsos_terms", "legalsos_privacy"] as const)("keeps %s bilingual and separate from commissions", (type) => {
    expect(parseTermsDraftInput({contentAr: "النص", contentEn: "Content"}, type).documentType).toBe(type);
    expect(() => parseTermsDraftInput({contentAr: "", contentEn: "Content"}, type)).toThrow("invalid_content_ar");
    expect(() => parseTermsDraftInput({...lawyerInput}, type)).toThrow("invalid_percentage");
  });
  it.each([
    [{ ...lawyerInput, contentAr: "   " }, "invalid_content_ar"],
    [{ ...lawyerInput, contentEn: "" }, "invalid_content_en"],
  ])("requires bilingual content", (input, code) => {
    expect(() => parseTermsDraftInput(input, "lawyer_registration")).toThrow(code);
  });

  it("accepts only legal document types", () => {
    expect(() => parseTermsDraftInput(lawyerInput, "unknown" as never)).toThrow("invalid_document_type");
  });

  it.each(["0", "0.00", "100", "100.00"])("accepts percentage boundary %s", (percentage) => {
    const result = parseTermsDraftInput({
      ...lawyerInput,
      platformPercentageYearOne: percentage,
      platformPercentageYearTwo: percentage,
    }, "lawyer_registration");
    expect(result.platformPercentageYearOne).toBe(Number(percentage).toFixed(2));
  });

  it.each(["-0.01", "100.01", "1.001", "abc", null])("rejects invalid percentage %s", (percentage) => {
    expect(() => parseTermsDraftInput({ ...lawyerInput, platformPercentageYearOne: percentage }, "lawyer_registration"))
      .toThrow("invalid_percentage");
  });

  it("derives lawyer shares from platform shares", () => {
    const result = parseTermsDraftInput(lawyerInput, "lawyer_registration");
    expect(result.lawyerPercentageYearOne).toBe("80.00");
    expect(result.lawyerPercentageYearTwo).toBe("55.00");
  });

  it("prohibits commission fields on general terms", () => {
    expect(() => parseTermsDraftInput({ ...lawyerInput }, "general")).toThrow("invalid_percentage");
  });

  it("returns null commission fields for general terms", () => {
    expect(parseTermsDraftInput({ contentAr: "عام", contentEn: "General" }, "general"))
      .toMatchObject({
        documentType: "general",
        platformPercentageYearOne: null,
        platformPercentageYearTwo: null,
        lawyerPercentageYearOne: null,
        lawyerPercentageYearTwo: null,
      });
  });

  it.each(["privacy", "refund"] as const)("accepts %s without commissions", (type) => {
    expect(parseTermsDraftInput({ contentAr: "سياسة", contentEn: "Policy" }, type))
      .toMatchObject({ documentType: type, contentAr: "سياسة", contentEn: "Policy", platformPercentageYearOne: null, platformPercentageYearTwo: null });
    expect(() => parseTermsDraftInput(lawyerInput, type)).toThrow("invalid_percentage");
  });
});
