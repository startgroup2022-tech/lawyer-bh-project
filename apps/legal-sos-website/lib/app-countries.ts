import { isCountryCode, knownCountry } from "./countries";
import type { CountryConfig } from "./countries";

type CountryRecord = Record<string, unknown>;

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = URL.parse(value);
  return url?.protocol === "https:" && url.hostname ? url.href : null;
}

function translations(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([locale, name]) => {
    const normalized = text(name);
    return /^[a-z]{2,12}(?:-[a-z0-9]{2,12})*$/i.test(locale) && normalized ? [[locale.toLowerCase(), normalized]] : [];
  }));
}

function languageCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.flatMap((locale) => {
    const normalized = text(locale).toLowerCase();
    return /^[a-z]{2,12}(?:-[a-z0-9]{2,12})*$/.test(normalized) ? [normalized] : [];
  }))];
}

export function resolveCountryName(
  country: {code:string;translations:Record<string,string>;defaultLanguage:string},
  locale: string,
): string {
  return text(country.translations[locale.toLowerCase()])
    || text(country.translations[country.defaultLanguage.toLowerCase()])
    || text(country.translations.en)
    || country.code;
}

export function parseAppCountriesResponse(input: unknown): CountryConfig[] {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid countries response");
  const envelope = input as CountryRecord;
  if (envelope.ok !== true || !Array.isArray(envelope.countries)) throw new Error("Invalid countries response");

  const result: CountryConfig[] = [];
  const seen = new Set<string>();
  for (const entry of envelope.countries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const item = entry as CountryRecord;
    if (typeof item.code !== "string" || !isCountryCode(item.code) || seen.has(item.code)) continue;
    if (item.legalSosEnabled !== true) continue;
    seen.add(item.code);
    const known = knownCountry(item.code);
    const canonicalTranslations = translations(item.translations);
    const legacyPayload = Object.keys(canonicalTranslations).length === 0;
    const countryTranslations = legacyPayload
      ? {
          ar:text(item.nameAr, known?.names.ar),
          en:text(item.nameEn, known?.names.en),
          tr:text(known?.names.tr),
        }
      : canonicalTranslations;
    const defaultLanguage = text(item.defaultLanguage, text(item.defaultLocale, "en")).toLowerCase();
    const enabledLanguages = languageCodes(item.enabledLanguages);
    result.push({
      code: item.code,
      names: {
        ar:resolveCountryName({code:item.code,translations:countryTranslations,defaultLanguage}, "ar"),
        en:resolveCountryName({code:item.code,translations:countryTranslations,defaultLanguage}, "en"),
        tr:resolveCountryName({code:item.code,translations:countryTranslations,defaultLanguage}, "tr"),
      },
      translations:countryTranslations,
      enabledLanguages,
      defaultLanguage,
      legalSosEnabled:true,
      currency: text(item.currencyCode, known?.currency ?? ""),
      dialCode: text(item.phoneCode, known?.dialCode ?? ""),
      bounds: known?.bounds ?? null,
      backgroundUrl: httpsUrl(item.backgroundUrl),
      servicesActive: item.servicesActive === true,
      defaultLocale: defaultLanguage,
    });
  }
  return result;
}
