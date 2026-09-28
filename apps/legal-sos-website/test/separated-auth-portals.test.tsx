import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminAccessPortal } from "@/components/AdminAccessPortal";
import { LawyerAccessPortal } from "@/components/LawyerAccessPortal";
import { PortalGateway } from "@/components/PortalGateway";
import { SiteProvider } from "@/components/providers/SiteProvider";
import { getDictionary } from "@/lib/i18n";
import { testBahrain } from "./country-fixtures";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("separated LegalSOS authentication portals", () => {
  it("routes each account type to an independent page without rendering a shared form", () => {
    render(<PortalGateway locale="ar" dictionary={getDictionary("ar")} />);

    expect(screen.getByRole("link", { name: /المستخدم/ })).toHaveAttribute("href", "/ar/portal/client");
    expect(screen.getByRole("link", { name: /المحامي/ })).toHaveAttribute("href", "/ar/portal/lawyer");
    expect(screen.getByRole("link", { name: /الإدارة/ })).toHaveAttribute("href", "/ar/portal/admin");
    expect(screen.queryByLabelText(/البريد الإلكتروني/)).not.toBeInTheDocument();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("keeps lawyer sign-in and lawyer registration on the lawyer page only", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    )));
    const dictionary = getDictionary("ar");
    render(
      <SiteProvider initialCountries={[testBahrain]}>
        <LawyerAccessPortal locale="ar" dictionary={dictionary} />
      </SiteProvider>,
    );

    expect(await screen.findByLabelText(dictionary.portal.lawyerAuth.identifier)).toBeInTheDocument();
    expect(screen.getByLabelText(dictionary.portal.lawyerAuth.password)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: dictionary.portal.gateway.lawyerSignIn })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: dictionary.portal.gateway.lawyerRegister })).toBeInTheDocument();
    expect(screen.queryByLabelText(dictionary.portal.auth.email)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: dictionary.portal.gateway.lawyerRegister }));
    expect(screen.getByRole("heading", { name: "التسجيل كمحامي" })).toBeInTheDocument();
  });

  it("keeps administration sign-in on a page with no registration action", () => {
    const dictionary = getDictionary("ar");
    render(<AdminAccessPortal locale="ar" dictionary={dictionary} />);

    expect(screen.getByRole("link", { name: dictionary.portal.gateway.adminSignIn })).toHaveAttribute(
      "href",
      "https://www.lawyers.bh/ar/login/admin",
    );
    expect(screen.queryByText(dictionary.portal.auth.createAccount)).not.toBeInTheDocument();
    expect(screen.queryByText(dictionary.portal.gateway.lawyerRegister)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(dictionary.portal.auth.email)).not.toBeInTheDocument();
  });
});
