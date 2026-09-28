import type { Locale } from "./i18n";

export type CountryCode = string;

export type CountryConfig = {
  code: CountryCode;
  names: Record<Locale, string>;
  translations: Record<string, string>;
  enabledLanguages: string[];
  defaultLanguage: string;
  legalSosEnabled: boolean;
  currency: string;
  dialCode: string;
  bounds: readonly [south: number, west: number, north: number, east: number] | null;
  backgroundUrl: string | null;
  servicesActive: boolean;
  defaultLocale: string;
};

type KnownCountry = Pick<CountryConfig, "code" | "names" | "currency" | "dialCode" | "bounds">;

export const knownCountries: readonly KnownCountry[] = [
  { code: "SA", names: { ar: "السعودية", en: "Saudi Arabia", tr: "Suudi Arabistan" }, currency: "SAR", dialCode: "+966", bounds: [16.3, 34.4, 32.2, 55.7] },
  { code: "BH", names: { ar: "البحرين", en: "Bahrain", tr: "Bahreyn" }, currency: "BHD", dialCode: "+973", bounds: [25.53, 50.32, 26.35, 50.85] },
  { code: "AE", names: { ar: "الإمارات", en: "United Arab Emirates", tr: "Birleşik Arap Emirlikleri" }, currency: "AED", dialCode: "+971", bounds: [22.62, 51.5, 26.1, 56.42] },
  { code: "KW", names: { ar: "الكويت", en: "Kuwait", tr: "Kuveyt" }, currency: "KWD", dialCode: "+965", bounds: [28.5, 46.5, 30.1, 48.7] },
  { code: "QA", names: { ar: "قطر", en: "Qatar", tr: "Katar" }, currency: "QAR", dialCode: "+974", bounds: [24.45, 50.68, 26.22, 51.72] },
  { code: "OM", names: { ar: "عُمان", en: "Oman", tr: "Umman" }, currency: "OMR", dialCode: "+968", bounds: [16.55, 52.0, 26.4, 59.9] },
  { code: "TR", names: { ar: "تركيا", en: "Turkey", tr: "Türkiye" }, currency: "TRY", dialCode: "+90", bounds: [35.7, 25.6, 42.2, 44.9] },
  { code: "EG", names: { ar: "مصر", en: "Egypt", tr: "Mısır" }, currency: "EGP", dialCode: "+20", bounds: [21.7, 24.6, 31.8, 36.9] },
] as const;

export function knownCountry(code: string): KnownCountry | undefined {
  return knownCountries.find((country) => country.code === code);
}

const detectionOrder = ["BH", "QA", "KW", "AE", "OM", "SA", "TR", "EG"] as const;

export function isCountryCode(value: string): value is CountryCode {
  return /^[A-Z]{2}$/.test(value);
}

export function resolveCountryFromCoordinates(
  latitude: number,
  longitude: number,
  availableCountries: readonly CountryConfig[] = knownCountries.map((country) => ({
    ...country,
    translations: country.names,
    enabledLanguages: ["ar", "en", "tr"],
    defaultLanguage: "en",
    legalSosEnabled: true,
    backgroundUrl: null,
    servicesActive: false,
    defaultLocale: "en",
  })),
): CountryCode | null {
  const ordered = [...availableCountries].sort((left, right) => {
    const leftIndex = detectionOrder.indexOf(left.code as typeof detectionOrder[number]);
    const rightIndex = detectionOrder.indexOf(right.code as typeof detectionOrder[number]);
    return (leftIndex < 0 ? detectionOrder.length : leftIndex) - (rightIndex < 0 ? detectionOrder.length : rightIndex);
  });
  for (const country of ordered) {
    if (!country.bounds) continue;
    const [south, west, north, east] = country.bounds;
    if (latitude >= south && latitude <= north && longitude >= west && longitude <= east) return country.code;
  }
  return null;
}

export function requestBrowserCountry(availableCountries: readonly CountryConfig[]): Promise<CountryCode | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve(resolveCountryFromCoordinates(coords.latitude, coords.longitude, availableCountries)),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 7_000, maximumAge: 900_000 },
    );
  });
}
