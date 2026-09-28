export function formatPrice(price: number, isAr: boolean, currencyCode = "BHD"): string {
  const currencyLabel = isAr && currencyCode === "BHD" ? "د.ب" : currencyCode;
  return `${price} ${currencyLabel}`;
}

export function toArabicDigits(value: string) {
  return value.replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
}

export function toEnglishDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

export function normalizePhoneInput(value: string) {
  const englishValue = toEnglishDigits(value);

  return englishValue
    .replace(/[^\d+\s()-]/g, "")
    .replace(/(?!^)\+/g, "")
    .slice(0, 40);
}
