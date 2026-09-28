import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Header } from "@/components/Header";
import { LawyerOnboardingFlow } from "@/components/LawyerOnboardingFlow";
import { SiteProvider } from "@/components/providers/SiteProvider";
import { getDictionary } from "@/lib/i18n";
import { testBahrain } from "./country-fixtures";

vi.mock("next/navigation", () => ({
  usePathname: () => "/ar",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

afterEach(cleanup);

describe("LegalSOS lawyer onboarding UI", () => {
  it("shows a clear lawyer-registration link in the Arabic navbar", () => {
    render(
      <SiteProvider initialCountries={[testBahrain]}>
        <Header locale="ar" dictionary={getDictionary("ar")} />
      </SiteProvider>,
    );

    expect(
      screen.getByRole("link", { name: "سجّل كمحامي" }),
    ).toHaveAttribute("href", "/ar/lawyer/register");
    expect(screen.getByRole("link", { name: "تسجيل الدخول" })).toBeInTheDocument();
  });

  it("starts registration with exactly name, email, and one personal-license number", async () => {
    const requests: Array<Record<string, unknown>> = [];
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return Response.json({ ok: true, nextStep: "check_email" }, { status: 202 });
    });
    render(
      <SiteProvider initialCountries={[testBahrain]}>
        <LawyerOnboardingFlow locale="ar" />
      </SiteProvider>,
    );

    const fields = screen.getAllByRole("textbox");
    expect(fields).toHaveLength(3);
    fireEvent.change(screen.getByLabelText("الاسم الكامل"), {
      target: { value: "أحمد المحامي" },
    });
    fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), {
      target: { value: "lawyer@example.com" },
    });
    fireEvent.change(screen.getByLabelText("الرقم الشخصي / رقم رخصة المحامي"), {
      target: { value: "12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ابدأ التسجيل" }));

    await screen.findByText("تحقق من بريدك الإلكتروني");
    expect(requests).toEqual([
      {
        countryCode: "BH",
        fullName: "أحمد المحامي",
        email: "lawyer@example.com",
        professionalIdentifier: "12345",
        locale: "ar",
      },
    ]);
  });

  it("shows clear locked and pending account states", () => {
    const { rerender } = render(
      <SiteProvider initialCountries={[testBahrain]}>
        <LawyerOnboardingFlow locale="ar" initialPreviewState="profile_incomplete" />
      </SiteProvider>,
    );

    expect(screen.getByText("الحساب غير مفعّل")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "أكمل بياناتك للتفعيل" }),
    ).toBeInTheDocument();

    rerender(
      <SiteProvider initialCountries={[testBahrain]}>
        <LawyerOnboardingFlow locale="ar" initialPreviewState="pending_approval" />
      </SiteProvider>,
    );
    expect(screen.getByText("طلبك بانتظار الموافقة")).toBeInTheDocument();
    expect(screen.queryByText("دخول لوحة المحامي")).not.toBeInTheDocument();
  });
});
