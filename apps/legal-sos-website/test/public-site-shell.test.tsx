import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PublicSiteShell } from "@/components/PublicSiteShell";
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

describe("public site shell", () => {
  afterEach(() => cleanup());

  it("wraps public content with the shared header and footer", () => {
    render(
      <PublicSiteShell locale="ar" dictionary={getDictionary("ar")} initialCountries={[bahrain]}>
        <main>محتوى الصفحة</main>
      </PublicSiteShell>,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("محتوى الصفحة")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
