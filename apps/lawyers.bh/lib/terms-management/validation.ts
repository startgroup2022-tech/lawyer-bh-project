import type { TermsDocumentType, TermsDraftInput } from "./types";

const commissionFields = [
  "platformPercentageYearOne",
  "platformPercentageYearTwo",
  "lawyerPercentageYearOne",
  "lawyerPercentageYearTwo",
] as const;

function requiredContent(value: unknown, code: "invalid_content_ar" | "invalid_content_en") {
  if (typeof value !== "string" || !value.trim()) throw new Error(code);
  return value.trim();
}

function percentageHundredths(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") throw new Error("invalid_percentage");
  const normalized = String(value).trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) throw new Error("invalid_percentage");
  const hundredths = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(hundredths) || hundredths < 0 || hundredths > 10_000) {
    throw new Error("invalid_percentage");
  }
  return hundredths;
}

function formatPercentage(hundredths: number) {
  return (hundredths / 100).toFixed(2);
}

export function parseDocumentType(value: unknown): TermsDocumentType {
  if (value !== "general" && value !== "privacy" && value !== "refund" && value !== "lawyer_registration" && value !== "legalsos_terms" && value !== "legalsos_privacy" && value !== "legalsos_lawyer_agreement") {
    throw new Error("invalid_document_type");
  }
  return value;
}

export function parseTermsDraftInput(value: unknown, documentType: TermsDocumentType): TermsDraftInput {
  parseDocumentType(documentType);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_content_ar");
  const input = value as Record<string, unknown>;
  const contentAr = requiredContent(input.contentAr, "invalid_content_ar");
  const contentEn = requiredContent(input.contentEn, "invalid_content_en");

  if (documentType !== "lawyer_registration") {
    if (commissionFields.some((field) => Object.hasOwn(input, field))) throw new Error("invalid_percentage");
    return {
      documentType,
      contentAr,
      contentEn,
      platformPercentageYearOne: null,
      platformPercentageYearTwo: null,
      lawyerPercentageYearOne: null,
      lawyerPercentageYearTwo: null,
    };
  }

  const platformYearOne = percentageHundredths(input.platformPercentageYearOne);
  const platformYearTwo = percentageHundredths(input.platformPercentageYearTwo);
  return {
    documentType,
    contentAr,
    contentEn,
    platformPercentageYearOne: formatPercentage(platformYearOne),
    platformPercentageYearTwo: formatPercentage(platformYearTwo),
    lawyerPercentageYearOne: formatPercentage(10_000 - platformYearOne),
    lawyerPercentageYearTwo: formatPercentage(10_000 - platformYearTwo),
  };
}
