import { describe, expect, it } from "vitest";

import { parseAppCountriesResponse, resolveCountryName } from "@/lib/app-countries";

describe("app country response", () => {
  it("normalizes enabled app countries and their HTTPS backgrounds", () => {
    const result = parseAppCountriesResponse({
      ok: true,
      countries: [
        {
          code: "BH",
          translations: { ar: "مملكة البحرين", en: "Kingdom of Bahrain", tr: "Bahreyn Krallığı" },
          enabledLanguages: ["ar", "en", "tr"],
          defaultLanguage: "ar",
          legalSosEnabled: true,
          backgroundUrl: "https://cdn.example.com/bahrain.jpg",
          servicesActive: true,
          phoneCode: "+973",
          currencyCode: "BHD",
          defaultLocale: "ar",
        },
        {
          code: "SA",
          nameAr: "السعودية",
          nameEn: "Saudi Arabia",
          backgroundUrl: "http://insecure.example.com/saudi.jpg",
          servicesActive: false,
          phoneCode: "+966",
          currencyCode: "SAR",
          defaultLocale: "en",
          legalSosEnabled: false,
        },
      ],
    });

    expect(result).toEqual([
      expect.objectContaining({
        code: "BH",
        names: { ar: "مملكة البحرين", en: "Kingdom of Bahrain", tr: "Bahreyn Krallığı" },
        translations: { ar: "مملكة البحرين", en: "Kingdom of Bahrain", tr: "Bahreyn Krallığı" },
        enabledLanguages: ["ar", "en", "tr"],
        defaultLanguage: "ar",
        legalSosEnabled: true,
        backgroundUrl: "https://cdn.example.com/bahrain.jpg",
        servicesActive: true,
        dialCode: "+973",
        currency: "BHD",
      }),
    ]);
  });

  it("resolves a name by current locale, then default, English, and country code", () => {
    expect(resolveCountryName({ code:"BH", translations:{ar:"البحرين",en:"Bahrain"}, defaultLanguage:"ar" }, "ar")).toBe("البحرين");
    expect(resolveCountryName({ code:"BH", translations:{ar:"البحرين",en:"Bahrain"}, defaultLanguage:"ar" }, "tr")).toBe("البحرين");
    expect(resolveCountryName({ code:"BH", translations:{en:"Bahrain"}, defaultLanguage:"ar" }, "tr")).toBe("Bahrain");
    expect(resolveCountryName({ code:"BH", translations:{}, defaultLanguage:"ar" }, "tr")).toBe("BH");
  });

  it("keeps the Arabic, English, and Turkish view populated through the fallback chain", () => {
    const [country] = parseAppCountriesResponse({
      ok:true,
      countries:[{
        code:"BH", translations:{ar:"البحرين",en:"Bahrain"}, enabledLanguages:["ar","en"],
        defaultLanguage:"ar", legalSosEnabled:true,
      }],
    });

    expect(country?.names).toEqual({ar:"البحرين",en:"Bahrain",tr:"البحرين"});
  });

  it("never consumes a country-specific LegalSOS URL", () => {
    const [country] = parseAppCountriesResponse({
      ok:true,
      countries:[{
        code:"BH", translations:{en:"Bahrain"}, enabledLanguages:["en"], defaultLanguage:"en",
        legalSosEnabled:true, legalSosUrl:"https://country.example.com",
      }],
    });

    expect(country).not.toHaveProperty("legalSosUrl");
    expect(country).not.toHaveProperty("websiteUrl");
  });

  it("ignores malformed and duplicate country entries", () => {
    const result = parseAppCountriesResponse({
      ok: true,
      countries: [
        { code: "BHR", nameEn: "Invalid" },
        { code: "BH", nameEn: "Bahrain", legalSosEnabled:true },
        { code: "BH", nameEn: "Duplicate Bahrain", legalSosEnabled:true },
        null,
      ],
    });

    expect(result.map((country) => country.code)).toEqual(["BH"]);
    expect(result[0]?.names.en).toBe("Bahrain");
  });

  it("rejects a malformed response envelope", () => {
    expect(() => parseAppCountriesResponse({ ok: false, countries: [] })).toThrow(
      "Invalid countries response",
    );
  });
});
