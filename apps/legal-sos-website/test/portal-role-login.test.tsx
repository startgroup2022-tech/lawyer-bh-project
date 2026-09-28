import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PortalShell } from "@/components/PortalShell";
import { SiteProvider } from "@/components/providers/SiteProvider";
import { getDictionary } from "@/lib/i18n";
import { testBahrain } from "./country-fixtures";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("LegalSOS client-only portal", () => {
  it("does not mount country-dependent lawyer registration before countries load", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)));
    const dictionary = getDictionary("ar");

    expect(() => render(
      <SiteProvider>
        <PortalShell locale="ar" dictionary={dictionary} />
      </SiteProvider>,
    )).not.toThrow();
  });

  it("offers only user sign-in and user registration", () => {
    const dictionary = getDictionary("ar");
    render(
      <SiteProvider initialCountries={[testBahrain]}>
        <PortalShell locale="ar" dictionary={dictionary} />
      </SiteProvider>,
    );

    expect(screen.getByRole("button", { name: dictionary.portal.auth.signIn })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: dictionary.portal.auth.createAccount })).toBeInTheDocument();
    expect(screen.queryByText(dictionary.portal.gateway.lawyerTitle)).not.toBeInTheDocument();
    expect(screen.queryByText(dictionary.portal.gateway.adminTitle)).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: dictionary.portal.roleTabs.label })).not.toBeInTheDocument();
  });

  it("opens the client sign-in form directly", () => {
    const dictionary = getDictionary("en");
    render(
      <SiteProvider initialCountries={[testBahrain]}>
        <PortalShell locale="en" dictionary={dictionary} />
      </SiteProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: dictionary.portal.auth.signIn }));
    expect(screen.getByLabelText(dictionary.portal.auth.email)).toBeInTheDocument();
    expect(screen.getByLabelText(dictionary.portal.auth.password)).toBeInTheDocument();
  });

  it("opens user account creation without any lawyer or administration actions", () => {
    const dictionary = getDictionary("ar");
    render(
      <SiteProvider initialCountries={[testBahrain]}>
        <PortalShell locale="ar" dictionary={dictionary} />
      </SiteProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: dictionary.portal.auth.createAccount }));
    expect(screen.getByLabelText(dictionary.portal.auth.name)).toBeInTheDocument();
    expect(screen.getByLabelText(dictionary.portal.auth.phone)).toBeInTheDocument();
    expect(screen.queryByText(dictionary.portal.gateway.lawyerSignIn)).not.toBeInTheDocument();
    expect(screen.queryByText(dictionary.portal.gateway.adminSignIn)).not.toBeInTheDocument();
  });
});
