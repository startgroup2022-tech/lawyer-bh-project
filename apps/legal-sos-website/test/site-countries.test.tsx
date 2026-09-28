import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CountryGate } from "@/components/CountryGate";
import { Hero } from "@/components/Hero";
import { SiteProvider, useSite } from "@/components/providers/SiteProvider";
import { getDictionary } from "@/lib/i18n";
import type { CountryConfig } from "@/lib/countries";

const bahrain: CountryConfig = {
  code: "BH",
  names: { ar: "البحرين", en: "Bahrain", tr: "Bahreyn" },
  translations: { ar: "البحرين", en: "Bahrain", tr: "Bahreyn" },
  enabledLanguages: ["ar", "en", "tr"], defaultLanguage: "ar", legalSosEnabled: true,
  currency: "BHD",
  dialCode: "+973",
  bounds: [25.53, 50.32, 26.35, 50.85],
  backgroundUrl: "https://cdn.example.com/bahrain.jpg",
  servicesActive: true,
  defaultLocale: "ar",
};

const saudi: CountryConfig = {
  code: "SA",
  names: { ar: "السعودية", en: "Saudi Arabia", tr: "Suudi Arabistan" },
  translations: { ar: "السعودية", en: "Saudi Arabia", tr: "Suudi Arabistan" },
  enabledLanguages: ["ar", "en", "tr"], defaultLanguage: "ar", legalSosEnabled: true,
  currency: "SAR",
  dialCode: "+966",
  bounds: [16.3, 34.4, 32.2, 55.7],
  backgroundUrl: "https://cdn.example.com/saudi.jpg",
  servicesActive: true,
  defaultLocale: "ar",
};

function CountryObserver() {
  const site = useSite();
  return <output aria-label="selected country">{site.country.code}</output>;
}

function OpenCountryMenuButton() {
  const site = useSite();
  return <button onClick={() => site.setCountryMenuOpen(true)}>Open countries</button>;
}

describe("website app-country state", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(window.navigator, "geolocation");
  });

  it("requests browser location on first visit without opening the country dialog", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({ coords: { latitude: 24.71, longitude: 46.67 } } as GeolocationPosition);
    });
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    const dictionary = getDictionary("en");
    render(
      <SiteProvider initialCountries={[bahrain, saudi]}>
        <CountryObserver />
        <CountryGate locale="en" dictionary={dictionary} />
      </SiteProvider>,
    );

    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByLabelText("selected country")).toHaveTextContent("SA"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("replaces a stale saved country with the first app-enabled country", async () => {
    window.localStorage.setItem("legal-sos-country", "AE");
    render(
      <SiteProvider initialCountries={[bahrain]}>
        <CountryObserver />
      </SiteProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText("selected country")).toHaveTextContent("BH"));
    expect(window.localStorage.getItem("legal-sos-country")).toBe("BH");
  });

  it("renders only app-enabled countries and changes the hero background on selection", async () => {
    const dictionary = getDictionary("en");
    const { container } = render(
      <SiteProvider initialCountries={[bahrain, saudi]}>
        <Hero locale="en" dictionary={dictionary} />
        <OpenCountryMenuButton />
        <CountryGate locale="en" dictionary={dictionary} />
      </SiteProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open countries" }));
    const bahrainOption = await screen.findByRole("button", { name: /Bahrain.*BH.*\+973/i });
    const saudiOption = screen.getByRole("button", { name: /Saudi Arabia.*SA.*\+966/i });
    expect(bahrainOption).toHaveAttribute("aria-pressed", "true");
    expect(saudiOption).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("United Arab Emirates")).not.toBeInTheDocument();
    expect(container.querySelector(".hero-image")).toHaveStyle({
      backgroundImage: 'url("https://cdn.example.com/bahrain.jpg")',
    });

    fireEvent.click(saudiOption);

    expect(container.querySelector(".hero-image")).toHaveStyle({
      backgroundImage: 'url("https://cdn.example.com/saudi.jpg")',
    });
  });
});
