import type { CountryConfig } from "@/lib/countries";

export const testBahrain: CountryConfig = {
  code: "BH",
  names: { ar: "البحرين", en: "Bahrain", tr: "Bahreyn" },
  translations: { ar: "البحرين", en: "Bahrain", tr: "Bahreyn" },
  enabledLanguages: ["ar", "en", "tr"],
  defaultLanguage: "ar",
  legalSosEnabled: true,
  currency: "BHD",
  dialCode: "+973",
  bounds: [25.53, 50.32, 26.35, 50.85],
  backgroundUrl: "https://cdn.example.com/bahrain.jpg",
  servicesActive: true,
  defaultLocale: "ar",
};
