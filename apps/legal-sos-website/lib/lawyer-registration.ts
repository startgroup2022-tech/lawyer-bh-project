export type LawyerRegistrationErrorCode =
  | "COUNTRY_UNAVAILABLE"
  | "DUPLICATE_EMAIL"
  | "DUPLICATE_LICENSE"
  | "INVALID_PHONE"
  | "INVALID_IBAN"
  | "INVALID_DOCUMENT"
  | "AGREEMENT_UNAVAILABLE"
  | "AGREEMENT_STALE"
  | "SERVICE_UNAVAILABLE";

const profiles = {
  BH: { dialCode: "+973", ibanPrefix: "BH" },
  SA: { dialCode: "+966", ibanPrefix: "SA" },
} as const;

const errors: Record<"ar" | "en" | "tr", Record<LawyerRegistrationErrorCode, string>> = {
  ar: {
    COUNTRY_UNAVAILABLE: "التسجيل غير متاح حاليًا في الدولة المختارة.",
    DUPLICATE_EMAIL: "البريد الإلكتروني مسجل مسبقًا.",
    DUPLICATE_LICENSE: "رقم رخصة المحاماة مسجل مسبقًا.",
    INVALID_PHONE: "أدخل رقم هاتف صحيحًا للدولة المختارة.",
    INVALID_IBAN: "أدخل رقم آيبان صحيحًا يبدأ برمز الدولة المختارة.",
    INVALID_DOCUMENT: "تحقق من نوع وحجم المستندات المرفوعة.",
    AGREEMENT_UNAVAILABLE: "اتفاقية المحامي غير متاحة لهذه الدولة حاليًا.",
    AGREEMENT_STALE: "تم تحديث الاتفاقية. راجع النسخة الجديدة ثم وافق عليها.",
    SERVICE_UNAVAILABLE: "خدمة التسجيل غير متاحة مؤقتًا. حاول لاحقًا.",
  },
  en: {
    COUNTRY_UNAVAILABLE: "Registration is not available in the selected country.",
    DUPLICATE_EMAIL: "This email address is already registered.",
    DUPLICATE_LICENSE: "This lawyer license number is already registered.",
    INVALID_PHONE: "Enter a valid phone number for the selected country.",
    INVALID_IBAN: "Enter an IBAN beginning with the selected country code.",
    INVALID_DOCUMENT: "Check the type and size of the uploaded documents.",
    AGREEMENT_UNAVAILABLE: "The lawyer agreement is unavailable for this country.",
    AGREEMENT_STALE: "The agreement was updated. Review and accept the new version.",
    SERVICE_UNAVAILABLE: "Registration is temporarily unavailable. Try again later.",
  },
  tr: {
    COUNTRY_UNAVAILABLE: "Seçilen ülkede kayıt şu anda kullanılamıyor.",
    DUPLICATE_EMAIL: "Bu e-posta adresi zaten kayıtlı.",
    DUPLICATE_LICENSE: "Bu avukat ruhsat numarası zaten kayıtlı.",
    INVALID_PHONE: "Seçilen ülke için geçerli bir telefon numarası girin.",
    INVALID_IBAN: "Seçilen ülke koduyla başlayan geçerli bir IBAN girin.",
    INVALID_DOCUMENT: "Yüklenen belgelerin türünü ve boyutunu kontrol edin.",
    AGREEMENT_UNAVAILABLE: "Bu ülke için avukat sözleşmesi kullanılamıyor.",
    AGREEMENT_STALE: "Sözleşme güncellendi. Yeni sürümü inceleyip kabul edin.",
    SERVICE_UNAVAILABLE: "Kayıt geçici olarak kullanılamıyor. Daha sonra deneyin.",
  },
};

export function countryRegistrationProfile(countryCode: string) {
  const profile = profiles[countryCode.toUpperCase() as keyof typeof profiles];
  if (!profile) throw new Error("COUNTRY_UNAVAILABLE");
  return profile;
}

export function validateCountryRegistration(countryCode: string, phone: string, iban: string): LawyerRegistrationErrorCode | null {
  let profile: (typeof profiles)[keyof typeof profiles];
  try { profile = countryRegistrationProfile(countryCode); }
  catch { return "COUNTRY_UNAVAILABLE"; }
  const normalizedPhone = phone.replace(/[\s()-]/g, "");
  if (!normalizedPhone.startsWith(profile.dialCode) || normalizedPhone.length < profile.dialCode.length + 7) return "INVALID_PHONE";
  if (!iban.replace(/\s+/g, "").toUpperCase().startsWith(profile.ibanPrefix)) return "INVALID_IBAN";
  return null;
}

export function lawyerRegistrationError(code: LawyerRegistrationErrorCode, locale: string) {
  const language = locale === "ar" || locale === "tr" ? locale : "en";
  return errors[language][code];
}
