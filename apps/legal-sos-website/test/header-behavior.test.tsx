import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Header } from "@/components/Header";
import { SiteProvider } from "@/components/providers/SiteProvider";
import type { CountryConfig } from "@/lib/countries";
import { getDictionary } from "@/lib/i18n";

vi.mock("next/navigation", () => ({
  usePathname: () => "/ar",
  useRouter: () => ({ push: vi.fn() }),
}));

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

function renderHeader() {
  return render(
    <SiteProvider initialCountries={[bahrain]}>
      <Header locale="ar" dictionary={getDictionary("ar")} />
    </SiteProvider>,
  );
}

describe("responsive public header", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 0 });
  });

  afterEach(() => cleanup());

  it("becomes compact after scrolling and includes the About page", async () => {
    renderHeader();
    const header = screen.getByRole("banner");

    expect(screen.getByRole("link", { name: "من نحن" })).toHaveAttribute("href", "/ar/about");
    expect(header).not.toHaveClass("is-scrolled");

    window.scrollY = 64;
    fireEvent.scroll(window);

    await waitFor(() => expect(header).toHaveClass("is-scrolled"));
  });

  it("closes the mobile menu with Escape and an outside click", () => {
    renderHeader();
    const menuButton = screen.getByRole("button", { name: "القائمة" });

    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(menuButton);
    fireEvent.pointerDown(document.body);
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });
});
