export type JoinStep = 1 | 2 | 3 | 4;

export type JoinFieldErrors = Record<string, string>;

export type JoinFileValue = {
  name: string;
  size: number;
  type: string;
} | null;

export type JoinValidationInput = {
  subscriptionTypes: string[];
  registrationLevel: string;
  experienceYears: string;
  mainSpecialty: string;
  subSpecialties: string[];
  profileImage: JoinFileValue;
  fullNameAr: string;
  fullNameEn: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  language: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  ibanNumber: string;
  ibanCertificateFile: JoinFileValue;
  workingHours: string;
  licenseFile: JoinFileValue;
  personalIdFile: JoinFileValue;
  institutionLicenseFile: JoinFileValue;
  agreed: boolean;
  signatureDataUrl: string;
};

type JoinLocale = "ar" | "en";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const JOIN_PROFILE_IMAGE_MAX_SIZE = 3 * 1024 * 1024;
const WORKING_HOURS = new Set(["09:00-13:00", "13:00-17:00", "09:00-17:00"]);
const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);
const PERSONAL_ID_TYPES = new Set([...DOCUMENT_TYPES, "image/webp"]);
const PROFILE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "avif",
  "heic",
  "heif",
  "bmp",
  "tif",
  "tiff",
]);

const FIELD_STEPS: Record<string, JoinStep> = {
  subscriptionType: 1,
  registrationLevel: 1,
  experienceYears: 1,
  specialties: 1,
  profileImage: 2,
  fullNameAr: 2,
  fullNameEn: 2,
  email: 2,
  phone: 2,
  password: 2,
  confirmPassword: 2,
  language: 2,
  licenseNumber: 3,
  licenseExpiryDate: 3,
  ibanNumber: 3,
  ibanCertificateFile: 3,
  workingHours: 3,
  licenseFile: 3,
  institutionLicenseFile: 3,
  personalIdFile: 3,
  agreed: 4,
  signatureDataUrl: 4,
};

function text(locale: JoinLocale, ar: string, en: string) {
  return locale === "ar" ? ar : en;
}

function fileExtension(file: NonNullable<JoinFileValue>) {
  return file.name.toLowerCase().split(".").pop() ?? "";
}

function resolvedDocumentType(file: NonNullable<JoinFileValue>) {
  if (file.type && file.type !== "application/octet-stream") return file.type;

  const extension = fileExtension(file);
  if (extension === "pdf") return "application/pdf";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return file.type;
}

function validateRequiredFile(
  errors: JoinFieldErrors,
  field: string,
  file: JoinFileValue,
  locale: JoinLocale,
  missing: [string, string],
  oversized: [string, string],
  invalidType: [string, string],
  allowedTypes: ReadonlySet<string>,
) {
  if (!file || file.size === 0) {
    errors[field] = text(locale, ...missing);
  } else if (file.size > MAX_FILE_SIZE) {
    errors[field] = text(locale, ...oversized);
  } else if (!allowedTypes.has(resolvedDocumentType(file))) {
    errors[field] = text(locale, ...invalidType);
  }
}

function validateProfileImage(
  errors: JoinFieldErrors,
  file: JoinFileValue,
  locale: JoinLocale,
) {
  if (!file || file.size === 0) {
    errors.profileImage = text(locale, "يرجى رفع الصورة الشخصية", "Please upload profile image");
    return;
  }

  if (file.size > JOIN_PROFILE_IMAGE_MAX_SIZE) {
    errors.profileImage = text(locale, "يجب ألا يتجاوز حجم الصورة الشخصية 3MB", "Profile image must be 3MB or less");
    return;
  }

  const hasAllowedExtension = PROFILE_EXTENSIONS.has(fileExtension(file));
  const hasAllowedType =
    !file.type ||
    file.type === "application/octet-stream" ||
    (file.type.startsWith("image/") && file.type !== "image/svg+xml");

  if (!hasAllowedExtension || !hasAllowedType) {
    errors.profileImage = text(locale, "نوع الصورة الشخصية غير مدعوم", "Invalid profile image type");
  }
}

export function validateJoinStep(
  input: JoinValidationInput,
  step: JoinStep,
  locale: JoinLocale,
): JoinFieldErrors {
  const errors: JoinFieldErrors = {};

  if (step === 1) {
    if (input.subscriptionTypes.length === 0) {
      errors.subscriptionType = text(locale, "يرجى اختيار نوع اشتراك واحد على الأقل", "Please select at least one subscription type");
    }

    if (!input.experienceYears) {
      errors.experienceYears = text(locale, "يرجى إدخال سنوات الخبرة", "Please enter years of experience");
    } else if (
      Number.isNaN(Number(input.experienceYears)) ||
      Number(input.experienceYears) < 0 ||
      Number(input.experienceYears) > 80
    ) {
      errors.experienceYears = text(locale, "سنوات الخبرة غير صحيحة", "Invalid years of experience");
    }

    if (input.subscriptionTypes.includes("Lawyer") && !input.registrationLevel) {
      errors.registrationLevel = text(locale, "يرجى اختيار نوع القيد", "Please select registration level");
    }

    if (!input.mainSpecialty) {
      errors.specialties = text(locale, "يرجى اختيار التخصص الرئيسي", "Please select the main specialty");
    } else if (
      input.subSpecialties.length !== 2 ||
      new Set(input.subSpecialties).size !== 2
    ) {
      errors.specialties = text(locale, "يرجى اختيار تخصصين فرعيين", "Please select 2 sub-specialties");
    }
  }

  if (step === 2) {
    validateProfileImage(errors, input.profileImage, locale);

    if (!input.fullNameAr) errors.fullNameAr = text(locale, "يرجى إدخال الاسم الكامل بالعربي", "Please enter full Arabic name");
    if (!input.fullNameEn) errors.fullNameEn = text(locale, "يرجى إدخال الاسم الكامل بالإنجليزي", "Please enter full English name");
    if (!input.email) {
      errors.email = text(locale, "يرجى إدخال البريد الإلكتروني", "Please enter email");
    } else if (!/^\S+@\S+\.\S+$/.test(input.email)) {
      errors.email = text(locale, "البريد الإلكتروني غير صحيح", "Invalid email address");
    }
    if (!input.phone) errors.phone = text(locale, "يرجى إدخال رقم الهاتف", "Please enter phone number");
    if (!input.password) {
      errors.password = text(locale, "يرجى إدخال كلمة المرور", "Please enter password");
    } else if (
      input.password.length < 8 ||
      !/[A-Z]/.test(input.password) ||
      !/[a-z]/.test(input.password) ||
      !/\d/.test(input.password)
    ) {
      errors.password = text(
        locale,
        "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم",
        "Password must be at least 8 characters and include uppercase, lowercase, and a number",
      );
    }
    if (!input.confirmPassword) {
      errors.confirmPassword = text(locale, "يرجى تأكيد كلمة المرور", "Please confirm password");
    } else if (input.password !== input.confirmPassword) {
      errors.confirmPassword = text(locale, "كلمتا المرور غير متطابقتين", "Passwords do not match");
    }
    if (!input.language) errors.language = text(locale, "يرجى اختيار اللغة", "Please select language");
  }

  if (step === 3) {
    if (!input.licenseNumber) {
      errors.licenseNumber = text(
        locale,
        "يرجى إدخال رقم الرخصة أو الرقم الشخصي",
        "Please enter the license number or personal number",
      );
    }

    if (!input.licenseExpiryDate) {
      errors.licenseExpiryDate = text(locale, "يرجى إدخال تاريخ انتهاء الرخصة", "Please enter license expiry date");
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(input.licenseExpiryDate);
      expiry.setHours(0, 0, 0, 0);
      if (Number.isNaN(expiry.getTime()) || expiry < today) {
        errors.licenseExpiryDate = text(locale, "تاريخ انتهاء الرخصة لا يمكن أن يكون قديماً", "License expiry date cannot be in the past");
      }
    }

    const ibanNumber = input.ibanNumber.replace(/\s+/g, "").toUpperCase();
    if (!ibanNumber) {
      errors.ibanNumber = text(locale, "يرجى إدخال رقم الآيبان", "Please enter IBAN number");
    } else if (!/^BH\d{2}[A-Z0-9]{18}$/.test(ibanNumber)) {
      errors.ibanNumber = text(locale, "رقم الآيبان غير صحيح. يجب أن يبدأ بـ BH ويتكون من 22 خانة", "Invalid IBAN. It must start with BH and contain 22 characters");
    }

    validateRequiredFile(
      errors,
      "ibanCertificateFile",
      input.ibanCertificateFile,
      locale,
      ["يرجى رفع شهادة الآيبان", "Please upload IBAN certificate"],
      ["يجب ألا يتجاوز حجم شهادة الآيبان 5MB", "IBAN certificate must be 5MB or less"],
      ["نوع ملف شهادة الآيبان غير مدعوم", "Invalid IBAN certificate file type"],
      DOCUMENT_TYPES,
    );

    if (!input.workingHours) {
      errors.workingHours = text(locale, "يرجى اختيار ساعات العمل", "Please select working hours");
    } else if (!WORKING_HOURS.has(input.workingHours)) {
      errors.workingHours = text(locale, "فترة العمل غير صحيحة", "Invalid working hours period");
    }

    validateRequiredFile(
      errors,
      "licenseFile",
      input.licenseFile,
      locale,
      ["يرجى رفع رخصة الممارسة", "Please upload practice license"],
      ["يجب ألا يتجاوز حجم رخصة الممارسة 5MB", "Practice license file must be 5MB or less"],
      ["نوع ملف رخصة الممارسة غير مدعوم", "Invalid practice license file type"],
      DOCUMENT_TYPES,
    );

    validateRequiredFile(
      errors,
      "personalIdFile",
      input.personalIdFile,
      locale,
      ["يرجى رفع البطاقة الشخصية", "Please upload personal ID card"],
      ["يجب ألا يتجاوز حجم البطاقة الشخصية 5MB", "Personal ID file must be 5MB or less"],
      ["نوع ملف البطاقة الشخصية غير مدعوم", "Invalid personal ID file type"],
      PERSONAL_ID_TYPES,
    );

    if (input.institutionLicenseFile) {
      validateRequiredFile(
        errors,
        "institutionLicenseFile",
        input.institutionLicenseFile,
        locale,
        ["", ""],
        ["يجب ألا يتجاوز حجم رخصة المؤسسة 5MB", "Institution license file must be 5MB or less"],
        ["نوع ملف رخصة المؤسسة غير مدعوم", "Invalid institution license file type"],
        DOCUMENT_TYPES,
      );
    }
  }

  if (step === 4) {
    if (!input.agreed) {
      errors.agreed = text(locale, "يرجى الموافقة على الشروط والأحكام", "Please agree to the terms and conditions");
    }
    if (!input.signatureDataUrl) {
      errors.signatureDataUrl = text(locale, "يرجى إضافة التوقيع", "Please add your signature");
    }
  }

  return errors;
}

export function validateAllJoinSteps(
  input: JoinValidationInput,
  locale: JoinLocale,
): JoinFieldErrors {
  return {
    ...validateJoinStep(input, 1, locale),
    ...validateJoinStep(input, 2, locale),
    ...validateJoinStep(input, 3, locale),
    ...validateJoinStep(input, 4, locale),
  };
}

export function getJoinStepForField(field: string): JoinStep {
  return FIELD_STEPS[field] ?? 4;
}

export function getFirstJoinError(
  errors: JoinFieldErrors,
): { field: string; step: JoinStep } | null {
  const field = Object.keys(errors)[0];
  return field ? { field, step: getJoinStepForField(field) } : null;
}
