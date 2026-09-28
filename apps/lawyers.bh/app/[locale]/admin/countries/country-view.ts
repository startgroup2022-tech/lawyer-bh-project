import type { ManagedCountry } from "@/lib/countries/catalog";
import type { CountryLanguageSelection, CountryProduct } from "@/lib/countries/languages";

export type CountryPatch = Partial<ManagedCountry>;

export function applyCountryPatch(countries: ManagedCountry[], code: string, patch: CountryPatch) {
  return countries.map(country => country.code === code ? {...country, ...patch} : country);
}

export function buildCountryLanguagePatch(selection: CountryLanguageSelection): CountryPatch {
  return {
    languages: selection.enabledLanguages,
    defaultLocale: selection.defaultLanguage,
    translations: selection.translations,
    ...(selection.translations.ar ? {nameAr: selection.translations.ar} : {}),
    ...(selection.translations.en ? {nameEn: selection.translations.en} : {}),
  };
}

export function buildPlatformUpdate(product: CountryProduct, enabled: boolean) {
  return {product, enabled};
}

export function buildPlatformPatch(product: CountryProduct, state: {enabled: boolean; tablesProvisioned: boolean}): CountryPatch {
  return product === "lawyers"
    ? {lawyersPlatformEnabled: state.enabled, websiteEnabled: state.enabled, tablesProvisioned: state.tablesProvisioned}
    : {legalSosEnabled: state.enabled, appEnabled: state.enabled, tablesProvisioned: state.tablesProvisioned};
}

export function confirmPlatformChange(nextEnabled: boolean, confirmDisable: () => boolean) {
  return nextEnabled || confirmDisable();
}

export async function submitPlatformChange<T>(
  product: CountryProduct,
  enabled: boolean,
  confirmDisable: () => boolean,
  request: (payload: ReturnType<typeof buildPlatformUpdate>) => Promise<T>,
): Promise<T | {cancelled: true}> {
  if (!confirmPlatformChange(enabled, confirmDisable)) return {cancelled: true};
  return request(buildPlatformUpdate(product, enabled));
}

export function summarizeCountries(countries: ManagedCountry[]) {
  return countries.reduce(
    (summary, country) => ({
      total: summary.total + 1,
      lawyersEnabled: summary.lawyersEnabled + Number(country.lawyersPlatformEnabled),
      legalSosEnabled: summary.legalSosEnabled + Number(country.legalSosEnabled),
      tablesReady: summary.tablesReady + Number(country.tablesProvisioned),
    }),
    { total: 0, lawyersEnabled: 0, legalSosEnabled: 0, tablesReady: 0 },
  );
}

export function getCountryReadinessLabel(country: ManagedCountry, isAr: boolean) {
  if (country.tablesProvisioned) return isAr ? "جداول الدولة جاهزة" : "Country tables ready";
  return isAr ? "جداول الدولة غير مجهّزة" : "Country tables not provisioned";
}

export function getPlatformStateLabel(enabled: boolean, isAr: boolean) {
  if (enabled) return isAr ? "قاعدة البيانات مفعّلة" : "Database activated";
  return isAr ? "قاعدة البيانات غير مفعّلة" : "Database not activated";
}

export function getPlatformDisableConfirmation(isAr: boolean) {
  return isAr
    ? "سيُوقف هذا خدمات قاعدة البيانات الجديدة فقط. ستبقى الجداول والبيانات التاريخية محفوظة. هل تريد المتابعة؟"
    : "This stops new database services only. Tables and historical data are retained. Continue?";
}

export type CountryLanguageValidation =
  | {ok: true}
  | {ok: false; reason: "NO_LANGUAGES"}
  | {ok: false; reason: "DEFAULT_NOT_ENABLED"}
  | {ok: false; reason: "TRANSLATION_REQUIRED"; language: string};

export function validateCountryLanguages(selection: CountryLanguageSelection): CountryLanguageValidation {
  if (!selection.enabledLanguages.length) return {ok: false, reason: "NO_LANGUAGES"};
  if (!selection.enabledLanguages.includes(selection.defaultLanguage)) {
    return {ok: false, reason: "DEFAULT_NOT_ENABLED"};
  }
  const missing = selection.enabledLanguages.find(code => !selection.translations[code]?.trim());
  if (missing) return {ok: false, reason: "TRANSLATION_REQUIRED", language: missing};
  return {ok: true};
}
