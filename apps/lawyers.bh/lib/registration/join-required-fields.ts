import type {
  JoinFieldErrors,
  JoinStep,
} from "./join-step-validation";

export const JOIN_REQUIRED_FIELDS = {
  1: ["subscriptionType", "experienceYears", "specialties"],
  2: [
    "profileImage",
    "fullNameAr",
    "fullNameEn",
    "email",
    "phone",
    "password",
    "confirmPassword",
    "language",
  ],
  3: [
    "licenseNumber",
    "licenseExpiryDate",
    "ibanNumber",
    "ibanCertificateFile",
    "workingHours",
    "licenseFile",
    "personalIdFile",
  ],
  4: ["agreed", "signatureDataUrl"],
} as const satisfies Readonly<Record<JoinStep, readonly string[]>>;

export function joinInvalidProps(field: string, errors: JoinFieldErrors): {
  "aria-invalid": boolean;
  "aria-describedby"?: string;
} {
  if (!errors[field]) return { "aria-invalid": false };

  return {
    "aria-invalid": true,
    "aria-describedby": `${field}-error`,
  };
}
