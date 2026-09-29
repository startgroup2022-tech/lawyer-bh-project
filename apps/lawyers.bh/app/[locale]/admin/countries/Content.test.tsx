import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Content, { CountryDatabaseControl } from "./Content";
import CountryLanguagesPanel from "./CountryLanguagesPanel";
import CountryPlatformPanel from "./CountryPlatformPanel";
import type { ManagedCountry } from "@/lib/countries/catalog";
import type { PlatformLanguage } from "@/lib/countries/languages";

const country = {
  code: "BH",
  nameAr: "البحرين",
  nameEn: "Bahrain",
  lawyersPlatformEnabled: true,
  legalSosEnabled: false,
  lawyersPlatformUrl: "https://lawyers.bh/",
  tablesProvisioned: true,
  appEnabled: false,
  websiteEnabled: true,
  backgroundUrl: null,
  backgroundOpacity: 100,
  backgroundOverlayOpacity: 0,
  backgroundColor: null,
  websiteUrl: "https://lawyers.bh/",
  servicesActive: true,
  phoneCode: "+973",
  currencyCode: "BHD",
  languages: ["ar", "en"],
  defaultLocale: "ar",
  translations: {ar: "البحرين", en: "Bahrain"},
} as ManagedCountry;

const languages: PlatformLanguage[] = [
  {code: "ar", adminName: "Arabic", nativeName: "العربية", direction: "rtl", status: "published"},
  {code: "en", adminName: "English", nativeName: "English", direction: "ltr", status: "published"},
  {code: "fr", adminName: "French", nativeName: "Français", direction: "ltr", status: "draft"},
];

const unprovisioned = {
  ...country,
  code: "SA",
  nameAr: "السعودية",
  nameEn: "Saudi Arabia",
  phoneCode: "+966",
  currencyCode: "SAR",
  tablesProvisioned: false,
} as ManagedCountry;

describe("Country Management presentation", () => {
  it("renders the Arabic admin hero, search surface, and loading state", () => {
    const html = renderToStaticMarkup(<Content isAr />);
    expect(html).toContain("إدارة الدول");
    expect(html).toContain("linear-gradient");
    expect(html).toContain('aria-label="البحث عن دولة"');
    expect(html).toContain("جاري تحميل الدول");
  });

  it("renders the English admin copy", () => {
    const html = renderToStaticMarkup(<Content isAr={false} />);
    expect(html).toContain("Country Management");
    expect(html).toContain("Lawyers Platform");
    expect(html).toContain("LegalSOS");
    expect(html).toContain('dir="ltr"');
  });

  it("renders independent database controls and destinations without legacy labels", () => {
    const html = renderToStaticMarkup(<CountryPlatformPanel country={country} isAr onSaved={() => undefined} />);
    expect(html).toContain("منصة محامون");
    expect(html).toContain("النجدة القانونية");
    expect(html).toContain("تفعيل قاعدة البيانات");
    expect(html).toContain("https://legalsos.org");
    expect(html).toContain("تطبيق LegalSOS للهواتف");
    expect(html).toContain("lawyersPlatformUrl");
    expect(html).toContain("peer-focus-visible:ring");
    expect(html).toContain('class="peer sr-only"');
    expect(html).not.toContain("تفعيل الموقع");
    expect(html).not.toContain("تفعيل التطبيق");
  });

  it("preserves explicit country table provisioning before product activation", () => {
    const form = renderToStaticMarkup(<CountryDatabaseControl country={unprovisioned} isAr isSaving={false} onProvision={() => undefined} />);
    expect(form).toContain("تجهيز قاعدة بيانات الدولة");
    expect(form).toContain('name="phoneCode"');
    expect(form).toContain('name="currencyCode"');
    expect(form).toContain('name="defaultLocale"');

    const ready = renderToStaticMarkup(<CountryDatabaseControl country={{...unprovisioned,tablesProvisioned:true}} isAr isSaving={false} onProvision={() => undefined} />);
    expect(ready).toContain("قاعدة البيانات مفعّلة");
    expect(ready).not.toContain('name="currencyCode"');
  });

  it("offers only published languages and exposes an enabled default selector", () => {
    const html = renderToStaticMarkup(<CountryLanguagesPanel country={country} languages={languages} isAr onSaved={() => undefined} />);
    expect(html).toContain("لغات الدولة");
    expect(html).toContain("العربية");
    expect(html).toContain("English");
    expect(html).not.toContain("Français");
    expect(html).toContain('name="defaultLanguage"');
    expect(html).toContain('aria-label="اللغة الافتراضية للبحرين"');
  });
});
