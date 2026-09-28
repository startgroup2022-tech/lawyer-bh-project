import { describe, expect, it } from "vitest";
import type { ManagedCountry } from "@/lib/countries/catalog";
import {
  applyCountryPatch,
  buildCountryLanguagePatch,
  buildPlatformPatch,
  buildPlatformUpdate,
  confirmPlatformChange,
  getCountryReadinessLabel,
  getPlatformDisableConfirmation,
  getPlatformStateLabel,
  submitPlatformChange,
  summarizeCountries,
  validateCountryLanguages,
} from "./country-view";

const countries = [
  { code: "BH", legalSosEnabled: true, lawyersPlatformEnabled: true, tablesProvisioned: true },
  { code: "SA", legalSosEnabled: true, lawyersPlatformEnabled: false, tablesProvisioned: false },
  { code: "AE", legalSosEnabled: false, lawyersPlatformEnabled: true, tablesProvisioned: true },
] as ManagedCountry[];

describe("country admin presentation", () => {
  it("summarizes each independent activation state", () => {
    expect(summarizeCountries(countries)).toEqual({
      total: 3,
      lawyersEnabled: 2,
      legalSosEnabled: 2,
      tablesReady: 2,
    });
  });

  it("labels physical table readiness separately from product activation", () => {
    expect(getCountryReadinessLabel(countries[0], true)).toBe("جداول الدولة جاهزة");
    expect(getCountryReadinessLabel(countries[1], true)).toBe("جداول الدولة غير مجهّزة");
    expect(getCountryReadinessLabel(countries[0], false)).toBe("Country tables ready");
    expect(getCountryReadinessLabel(countries[1], false)).toBe("Country tables not provisioned");
    expect(getPlatformStateLabel(true, true)).toBe("قاعدة البيانات مفعّلة");
    expect(getPlatformStateLabel(false, false)).toBe("Database not activated");
  });

  it("requires a translation for every enabled language and keeps the default enabled", () => {
    expect(validateCountryLanguages({
      enabledLanguages: ["ar", "en"],
      defaultLanguage: "ar",
      translations: {ar: "البحرين", en: "Bahrain"},
    })).toEqual({ok: true});
    expect(validateCountryLanguages({
      enabledLanguages: ["ar", "en"],
      defaultLanguage: "tr",
      translations: {ar: "البحرين", en: "Bahrain"},
    })).toEqual({ok: false, reason: "DEFAULT_NOT_ENABLED"});
    expect(validateCountryLanguages({
      enabledLanguages: ["ar", "en"],
      defaultLanguage: "ar",
      translations: {ar: "البحرين", en: " "},
    })).toEqual({ok: false, reason: "TRANSLATION_REQUIRED", language: "en"});
  });

  it("warns that disabling stops new workflows but retains historical data", () => {
    expect(getPlatformDisableConfirmation(true)).toContain("البيانات التاريخية محفوظة");
    expect(getPlatformDisableConfirmation(false)).toContain("historical data are retained");
  });

  it("merges sequential panel patches without losing the earlier panel change", () => {
    const initial = [{...countries[0], languages:["ar"], defaultLocale:"ar", translations:{ar:"البحرين"}}] as ManagedCountry[];
    const afterLanguages = applyCountryPatch(initial, "BH", buildCountryLanguagePatch({
      enabledLanguages:["ar","en"], defaultLanguage:"en", translations:{ar:"مملكة البحرين",en:"Bahrain"},
    }));
    const afterPlatform = applyCountryPatch(afterLanguages, "BH", buildPlatformPatch("legal_sos", {
      enabled:true, tablesProvisioned:true,
    }));
    expect(afterPlatform[0]).toMatchObject({
      nameAr:"مملكة البحرين", languages:["ar","en"], defaultLocale:"en",
      legalSosEnabled:true, appEnabled:true, tablesProvisioned:true,
    });
  });

  it("cancels a disable before mutation and builds the accepted platform payload", () => {
    let confirmations = 0;
    expect(confirmPlatformChange(false, () => { confirmations += 1; return false; })).toBe(false);
    expect(confirmations).toBe(1);
    expect(confirmPlatformChange(false, () => true)).toBe(true);
    expect(buildPlatformUpdate("lawyers", false)).toEqual({product:"lawyers",enabled:false});
  });

  it("does not request a cancelled disable and sends the accepted PUT payload", async () => {
    const requests:unknown[] = [];
    const request = async (payload:ReturnType<typeof buildPlatformUpdate>) => { requests.push(payload); return "ok"; };
    await expect(submitPlatformChange("legal_sos",false,()=>false,request)).resolves.toEqual({cancelled:true});
    expect(requests).toEqual([]);
    await expect(submitPlatformChange("legal_sos",false,()=>true,request)).resolves.toBe("ok");
    expect(requests).toEqual([{product:"legal_sos",enabled:false}]);
  });

  it("builds a language save patch with localized country names", () => {
    expect(buildCountryLanguagePatch({
      enabledLanguages:["ar","en"], defaultLanguage:"ar", translations:{ar:"البحرين الجديدة",en:"New Bahrain"},
    })).toEqual({
      languages:["ar","en"], defaultLocale:"ar", translations:{ar:"البحرين الجديدة",en:"New Bahrain"},
      nameAr:"البحرين الجديدة", nameEn:"New Bahrain",
    });
  });
});
