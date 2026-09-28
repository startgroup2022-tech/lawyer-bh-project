import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteFooter } from "@/components/SiteFooter";
import { SosDialog } from "@/components/SosDialog";
import { SiteProvider, useSite } from "@/components/providers/SiteProvider";
import { getDictionary } from "@/lib/i18n";
import { testBahrain } from "./country-fixtures";

function OpenSosDialogButton() {
  const site = useSite();
  return <button onClick={() => site.openSos()}>Open request</button>;
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("terms links", () => {
  it("links footer contact and eFada to LegalSOS", () => {
    render(<SiteProvider initialCountries={[testBahrain]}><SiteFooter locale="ar" dictionary={getDictionary("ar")} /></SiteProvider>);
    expect(screen.getByRole("link", { name: "info@legalsos.org" })).toHaveAttribute("href", "mailto:info@legalsos.org");
    expect(screen.getByRole("link", { name: "+973 3231 7070" })).toHaveAttribute("href", "tel:+97332317070");
    expect(screen.getByRole("link", { name: "إفادة" })).toHaveAttribute("href", "https://service.moic.gov.bh/newefadaapi/api/Seal/Cart?url=http://legalsos.org");
  });
  it("keeps the selected locale in the public footer link", () => {
    render(
      <SiteProvider initialCountries={[testBahrain]}>
        <SiteFooter locale="ar" dictionary={getDictionary("ar")} />
      </SiteProvider>,
    );

    expect(screen.getByRole("link", { name: "الشروط وسياسة الخصوصية" })).toHaveAttribute(
      "href",
      "/ar/terms",
    );
  });

  it("exposes the privacy policy from the request consent", async () => {
    const caseId = "00000000-0000-4000-8000-000000000001";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, cases: [{
        id: caseId, slug: "emergency-case", nameAr: "حالة طارئة", nameEn: "Emergency case",
        descriptionAr: "", descriptionEn: "", price: 1, iconKey: "shield-alert",
        workflowType: "emergency_dispatch",
      }] }),
    }));
    render(
      <SiteProvider initialCountries={[testBahrain]}>
        <OpenSosDialogButton />
        <SosDialog locale="en" dictionary={getDictionary("en")} />
      </SiteProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open request" }));
    fireEvent.click(await screen.findByRole("button", { name: /Emergency case/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("link", { name: "Privacy Policy and Terms" })).toHaveAttribute(
      "href",
      "/en/terms",
    );
  });
});
