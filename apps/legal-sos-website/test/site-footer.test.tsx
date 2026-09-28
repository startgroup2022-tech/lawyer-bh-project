import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SiteFooter } from "@/components/SiteFooter";
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

describe("site footer", () => {
  afterEach(() => cleanup());

  it("renders localized public links and current country contact context", () => {
    const dictionary = getDictionary("ar");
    render(
      <SiteProvider initialCountries={[bahrain]}>
        <SiteFooter locale="ar" dictionary={dictionary} />
      </SiteProvider>,
    );

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: dictionary.footer.links.home })).toHaveAttribute("href", "/ar");
    expect(screen.getByRole("link", { name: dictionary.footer.links.about })).toHaveAttribute("href", "/ar/about");
    expect(screen.getByRole("link", { name: dictionary.footer.links.lawyerRegister })).toHaveAttribute("href", "/ar/lawyer/register");
    const emailLink = screen.getByRole("link", { name: "info@legalsos.org" });
    expect(emailLink).toHaveClass("footer-email");
    expect(emailLink).toHaveAttribute("href", "mailto:info@legalsos.org");
    expect(emailLink.querySelector("svg")).toBeInTheDocument();
    const address = "مجمع ساريا سكوير، مبنى 1853ج، طريق 1546، مجمع 815، مدينة عيسى";
    const mapsAddress = "Saraya Square Complex, Building 1853G, Road 1546, Block 815, Isa Town, Bahrain";
    expect(screen.getByRole("link", { name: address })).toHaveAttribute(
      "href",
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsAddress)}`,
    );
    const phoneLink = screen.getByRole("link", { name: "+973 3231 7070" });
    expect(phoneLink).toHaveClass("footer-phone");
    expect(phoneLink).toHaveAttribute("href", "tel:+97332317070");
    expect(phoneLink).not.toHaveAttribute("dir");
    expect(screen.getByText("+973 3231 7070")).toHaveAttribute("dir", "ltr");
  });
});
