export type ProfileChangeFileKind =
  | "profileImage"
  | "licenseFile"
  | "ibanCertificate"
  | "institutionLicense"
  | "personalId"
  | "signature";

export type ProfileChangeErrorCode =
  | "IBAN_CERTIFICATE_REQUIRED"
  | "IBAN_INVALID"
  | "LICENSE_FILE_REQUIRED"
  | "LICENSE_EXPIRY_INVALID"
  | "FILE_TOO_LARGE"
  | "FILE_TYPE_INVALID";

type FileValue = Pick<File, "name" | "type" | "size">;

export type ProfileChangeValidationInput = Partial<Record<ProfileChangeFileKind, FileValue>> & {
  approvedIban?: string | null;
  ibanNumber?: string | null;
  approvedLicenseExpiryDate?: string | null;
  licenseExpiryDate?: string | null;
  registrationChanged?: boolean;
  today?: string;
};

const maxFileSize = 5 * 1024 * 1024;
const documentTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateProfileChangeSubmission(input: ProfileChangeValidationInput) {
  const errors: Partial<Record<ProfileChangeFileKind | "licenseExpiryDate" | "ibanNumber", ProfileChangeErrorCode>> = {};
  const normalizedIban = input.ibanNumber?.replace(/\s+/g, "").toUpperCase() ?? "";
  const approvedIban = input.approvedIban?.replace(/\s+/g, "").toUpperCase() ?? "";

  if (normalizedIban !== approvedIban && !input.ibanCertificate) {
    errors.ibanCertificate = "IBAN_CERTIFICATE_REQUIRED";
  }
  if (normalizedIban && !/^BH\d{2}[A-Z0-9]{18}$/.test(normalizedIban)) {
    errors.ibanNumber = "IBAN_INVALID";
  }

  const licenseChanged =
    input.licenseExpiryDate !== undefined &&
    input.licenseExpiryDate !== input.approvedLicenseExpiryDate;
  if ((licenseChanged || input.registrationChanged) && !input.licenseFile) {
    errors.licenseFile = "LICENSE_FILE_REQUIRED";
  }
  if (licenseChanged && input.licenseExpiryDate) {
    const today = input.today ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.licenseExpiryDate) || input.licenseExpiryDate <= today) {
      errors.licenseExpiryDate = "LICENSE_EXPIRY_INVALID";
    }
  }

  const fileEntries = [
    ["profileImage", input.profileImage, imageTypes],
    ["licenseFile", input.licenseFile, documentTypes],
    ["ibanCertificate", input.ibanCertificate, documentTypes],
    ["institutionLicense", input.institutionLicense, documentTypes],
    ["personalId", input.personalId, documentTypes],
    ["signature", input.signature, imageTypes],
  ] as const;

  for (const [kind, selected, allowed] of fileEntries) {
    if (!selected) continue;
    if (selected.size > maxFileSize) errors[kind] = "FILE_TOO_LARGE";
    else if (!allowed.has(selected.type)) errors[kind] = "FILE_TYPE_INVALID";
  }

  return errors;
}
