import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AboutPage } from "@/components/AboutPage";
import { SiteProvider } from "@/components/providers/SiteProvider";
import type { CountryConfig } from "@/lib/countries";
import { getDictionary } from "@/lib/i18n";

const bahrain: CountryConfig = {
  code: "BH",
  names: { ar: "البحرين", en: "Bahrain", tr: "Bahreyn" },
  translations: { ar: "البحرين", en: "Bahrain", tr: "Bahreyn" },
  enabledLanguages: ["ar", "en", "tr"],
  defaultLanguage: "ar",
  legalSosEnabled: true,
  currency: "BHD",
  dialCode: "+973",
  bounds: [25.53, 50.32, 26.35, 50.85],
  backgroundUrl: null,
  servicesActive: true,
  defaultLocale: "ar",
};

describe("About page", () => {
  afterEach(() => cleanup());

  it("presents the LegalSOS story and Omar Nabih Shaker as the sole leader", () => {
    const dictionary = getDictionary("ar");
    render(
      <SiteProvider initialCountries={[bahrain]}>
        <AboutPage locale="ar" dictionary={dictionary} />
      </SiteProvider>,
    );

    expect(screen.getByRole("heading", { level: 1, name: dictionary.about.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "عمر نبيه شاكر" })).toBeInTheDocument();
    expect(screen.getByText("رئيس مجلس الإدارة والرئيس التنفيذي")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "عمر نبيه شاكر" })).toHaveAttribute("src", expect.stringContaining("omar-nabih-shaker.jpg"));
    expect(screen.getAllByTestId("management-member")).toHaveLength(1);
    expect(screen.getByRole("link", { name: dictionary.about.cta.secondary })).toHaveAttribute("href", "/ar/lawyer/register");
  });
});
