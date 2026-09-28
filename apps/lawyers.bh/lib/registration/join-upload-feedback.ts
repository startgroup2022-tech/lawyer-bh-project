const documentLabels = {
  licenseFile: { ar: "ملف رخصة المحاماة", en: "Lawyer license" },
  institutionLicenseFile: { ar: "ملف رخصة المؤسسة", en: "Institution license" },
  ibanCertificateFile: { ar: "ملف شهادة الآيبان", en: "IBAN certificate" },
  personalIdFile: { ar: "ملف البطاقة الشخصية", en: "Personal ID" },
} as const;

type DocumentField = keyof typeof documentLabels;

export function joinUploadFeedback(
  data: { error?: unknown; field?: unknown },
  locale: "ar" | "en",
): { field: DocumentField; message: string } | null {
  if (
    data.error !== "invalid_document" ||
    typeof data.field !== "string" ||
    !Object.prototype.hasOwnProperty.call(documentLabels, data.field)
  ) return null;

  const field = data.field as DocumentField;
  const label = documentLabels[field][locale];
  return {
    field,
    message: locale === "ar"
      ? `${label} غير صالح. ارفع PDF صحيحًا غير محمي أو صورة مقبولة.`
      : `${label} is invalid. Upload a valid, unencrypted PDF or an accepted image.`,
  };
}
