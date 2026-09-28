import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type LawyerOnboardingStatus =
  | "email_pending"
  | "profile_incomplete"
  | "submitted"
  | "expired"
  | "cancelled";

export type LawyerOnboardingLocale = "ar" | "en" | "tr";

export type LawyerOnboardingPublicState = {
  id: string;
  countryCode: string;
  fullName: string;
  email: string;
  professionalIdentifier: string;
  locale: LawyerOnboardingLocale;
  status: LawyerOnboardingStatus;
  linkedLawyerId: string | null;
};

const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

export function normalizeProfessionalIdentifier(value: string) {
  return value
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/\s+/g, "");
}

export function normalizeOnboardingEmail(value: string) {
  return value.trim().toLowerCase();
}

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function safeEqualTokenHash(token: string, expectedHash: string) {
  if (!/^[a-f0-9]{64}$/i.test(expectedHash)) return false;

  const actual = Buffer.from(hashOpaqueToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return timingSafeEqual(actual, expected);
}
