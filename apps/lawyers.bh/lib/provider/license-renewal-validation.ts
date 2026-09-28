export type LicenseRenewalErrorCode =
  | "LICENSE_EXPIRY_REQUIRED"
  | "LICENSE_EXPIRY_INVALID"
  | "LICENSE_FILE_REQUIRED"
  | "LICENSE_FILE_TOO_LARGE"
  | "LICENSE_FILE_TYPE_INVALID"
  | "LICENSE_UPDATE_NOT_ALLOWED"
  | "LICENSE_UPLOAD_FAILED";

export type LicenseRenewalFile = {
  name: string;
  type: string;
  size: number;
};

export type LicenseRenewalErrors = {
  licenseExpiryDate?: LicenseRenewalErrorCode;
  licenseFile?: LicenseRenewalErrorCode;
};

const allowedLicenseTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const maxLicenseFileSize = 5 * 1024 * 1024;

function isValidCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function resolveLicenseMimeType(
  file: Pick<LicenseRenewalFile, "name" | "type">,
) {
  if (allowedLicenseTypes.has(file.type)) return file.type;

  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

export function validateLicenseRenewalInput(input: {
  licenseExpiryDate: string;
  file: LicenseRenewalFile | null;
  today?: string;
}): LicenseRenewalErrors {
  const errors: LicenseRenewalErrors = {};
  const expiry = input.licenseExpiryDate.trim();
  const today = input.today ?? new Date().toISOString().slice(0, 10);

  if (!expiry) {
    errors.licenseExpiryDate = "LICENSE_EXPIRY_REQUIRED";
  } else if (!isValidCalendarDate(expiry) || expiry <= today) {
    errors.licenseExpiryDate = "LICENSE_EXPIRY_INVALID";
  }

  if (!input.file || input.file.size === 0) {
    errors.licenseFile = "LICENSE_FILE_REQUIRED";
  } else if (input.file.size > maxLicenseFileSize) {
    errors.licenseFile = "LICENSE_FILE_TOO_LARGE";
  } else if (!allowedLicenseTypes.has(resolveLicenseMimeType(input.file))) {
    errors.licenseFile = "LICENSE_FILE_TYPE_INVALID";
  }

  return errors;
}

const messages: Record<
  LicenseRenewalErrorCode,
  { ar: string; en: string }
> = {
  LICENSE_EXPIRY_REQUIRED: {
    ar: "تاريخ انتهاء الرخصة الجديدة مطلوب",
    en: "New license expiry date is required",
  },
  LICENSE_EXPIRY_INVALID: {
    ar: "يجب إدخال تاريخ انتهاء صحيح بعد تاريخ اليوم",
    en: "Enter a valid expiry date after today",
  },
  LICENSE_FILE_REQUIRED: {
    ar: "ملف الرخصة الجديدة مطلوب",
    en: "Renewed license file is required",
  },
  LICENSE_FILE_TOO_LARGE: {
    ar: "يجب ألا يتجاوز حجم الملف 5 ميجابايت",
    en: "The file must not exceed 5 MB",
  },
  LICENSE_FILE_TYPE_INVALID: {
    ar: "يجب أن يكون الملف PDF أو JPG أو PNG",
    en: "The file must be PDF, JPG, or PNG",
  },
  LICENSE_UPDATE_NOT_ALLOWED: {
    ar: "لا يمكن تحديث الرخصة في حالة الحساب الحالية",
    en: "The license cannot be updated in the current account state",
  },
  LICENSE_UPLOAD_FAILED: {
    ar: "تعذر رفع الرخصة. يرجى المحاولة مرة أخرى",
    en: "Could not upload the license. Please try again",
  },
};

export function isLicenseRenewalErrorCode(
  value: unknown,
): value is LicenseRenewalErrorCode {
  return typeof value === "string" && value in messages;
}

export function licenseRenewalErrorMessage(
  code: LicenseRenewalErrorCode,
  locale: "ar" | "en",
) {
  return messages[code][locale];
}
