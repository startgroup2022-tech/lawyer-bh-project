import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LawyerAccessPortal } from "@/components/LawyerAccessPortal";
import { SiteProvider } from "@/components/providers/SiteProvider";
import { getDictionary } from "@/lib/i18n";
import { testBahrain } from "./country-fixtures";

const lawyer = {
  id: "lawyer-1",
  countryCode: "BH",
  nameAr: "محامي اختبار",
  nameEn: "Test Lawyer",
  email: "lawyer@example.test",
  phone: "+97330000000",
  registrationNo: "BH-100",
  status: "approved",
  active: true,
  emergencyReady: true,
  isAvailable: true,
  image: null,
  rating: 4.5,
  totalRequests: 5,
  completedRequests: 3,
};

const requestLists = {
  advocateOnline: true,
  now: "2026-09-24T10:00:00.000Z",
  newOffers: [{
    id: "new-1", caseRef: "SOS-NEW", caseType: "arrest", baseFeeBhd: 150,
    createdAt: "2026-09-24T09:00:00.000Z", deadline: null,
  }],
  activeCases: [{
    id: "active-1", caseRef: "SOS-ACTIVE", caseType: "arrest",
    workflowType: "emergency_dispatch", contactName: "عميل", location: null,
    serviceStatus: "mobilizing", createdAt: "2026-09-24T08:00:00.000Z",
  }],
  completedCases: [{
    id: "done-1", caseRef: "SOS-DONE", caseType: "arrest",
    workflowType: "emergency_dispatch", serviceStatus: "completed",
    createdAt: "2026-09-23T08:00:00.000Z", completedAt: "2026-09-23T09:00:00.000Z",
  }],
};

function renderPortal() {
  const dictionary = getDictionary("ar");
  render(
    <SiteProvider initialCountries={[testBahrain]}>
      <LawyerAccessPortal locale="ar" dictionary={dictionary} />
    </SiteProvider>,
  );
  return dictionary;
}

describe("embedded LegalSOS lawyer portal", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows only lawyer sign-in and registration controls when signed out", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    )));
    const dictionary = renderPortal();

    expect(await screen.findByLabelText(dictionary.portal.lawyerAuth.identifier)).toBeInTheDocument();
    expect(screen.getByLabelText(dictionary.portal.lawyerAuth.password)).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: dictionary.portal.lawyerAuth.signIn })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: dictionary.portal.gateway.lawyerRegister })).toBeInTheDocument();
    expect(screen.queryByLabelText(dictionary.portal.auth.email)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: dictionary.portal.gateway.lawyerSignIn })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: dictionary.portal.gateway.back })).toHaveAttribute("href", "/ar/portal");
  });

  it("shows a generic invalid-credentials message", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/session")) {
        return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
      }
      return Response.json({ ok: false, error: "INVALID_CREDENTIALS" }, { status: 401 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = renderPortal();

    fireEvent.change(await screen.findByLabelText(dictionary.portal.lawyerAuth.identifier), {
      target: { value: "BH-100" },
    });
    fireEvent.change(screen.getByLabelText(dictionary.portal.lawyerAuth.password), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: dictionary.portal.lawyerAuth.signIn }));

    expect(await screen.findByRole("alert")).toHaveTextContent(dictionary.portal.lawyerAuth.invalidCredentials);
  });

  it("keeps password reset non-enumerating and returns to login", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/session")) {
        return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
      }
      return Response.json({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = renderPortal();

    fireEvent.click(await screen.findByRole("button", { name: dictionary.portal.lawyerAuth.forgotPassword }));
    fireEvent.change(screen.getByLabelText(dictionary.portal.lawyerAuth.identifier), {
      target: { value: "BH-100" },
    });
    fireEvent.click(screen.getByRole("button", { name: dictionary.portal.lawyerAuth.resetSubmit }));

    expect(await screen.findByRole("status")).toHaveTextContent(dictionary.portal.lawyerAuth.resetSent);
    fireEvent.click(screen.getByRole("button", { name: dictionary.portal.lawyerAuth.backToLogin }));
    expect(screen.getByLabelText(dictionary.portal.lawyerAuth.password)).toHaveValue("");
  });

  it("unmounts login state when opening registration", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    )));
    const dictionary = renderPortal();

    const password = await screen.findByLabelText(dictionary.portal.lawyerAuth.password);
    fireEvent.change(password, { target: { value: "must-clear" } });
    fireEvent.click(screen.getByRole("button", { name: dictionary.portal.gateway.lawyerRegister }));

    expect(screen.getByRole("heading", { name: "التسجيل كمحامي" })).toBeInTheDocument();
    expect(document.querySelector('input[name="lawyerPassword"]')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: dictionary.portal.lawyerAuth.backToLogin }));
    expect(await screen.findByLabelText(dictionary.portal.lawyerAuth.password)).toHaveValue("");
  });

  it("switches to the dashboard and renders all request groups after login", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/lawyer-auth/session") && (!init?.method || init.method === "GET")) {
        return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
      }
      if (url.endsWith("/api/lawyer-auth/login")) return Response.json({ ok: true, lawyer });
      if (url.endsWith("/api/lawyer-auth/requests")) return Response.json({ ok: true, requests: requestLists });
      return Response.json({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = renderPortal();

    fireEvent.change(await screen.findByLabelText(dictionary.portal.lawyerAuth.identifier), {
      target: { value: "BH-100" },
    });
    fireEvent.change(screen.getByLabelText(dictionary.portal.lawyerAuth.password), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: dictionary.portal.lawyerAuth.signIn }));

    expect(await screen.findByRole("heading", { name: dictionary.portal.lawyerAuth.dashboardTitle })).toBeInTheDocument();
    expect(screen.getByText("محامي اختبار")).toBeInTheDocument();
    expect(await screen.findByText("SOS-NEW")).toBeInTheDocument();
    expect(screen.getByText("SOS-ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("SOS-DONE")).toBeInTheDocument();
    expect(screen.queryByLabelText(dictionary.portal.lawyerAuth.password)).not.toBeInTheDocument();
  });

  it("keeps the dashboard signed in when request refresh fails and allows retry", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/session")) return Response.json({ ok: true, lawyer });
      return Response.json({ ok: false, error: "REQUESTS_UNAVAILABLE" }, { status: 502 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = renderPortal();

    expect(await screen.findByRole("heading", { name: dictionary.portal.lawyerAuth.dashboardTitle })).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(dictionary.portal.lawyerAuth.serviceUnavailable);
    expect(screen.getByRole("button", { name: dictionary.portal.lawyerAuth.retry })).toBeInTheDocument();
    expect(screen.getByText("محامي اختبار")).toBeInTheDocument();
  });

  it("signs out and returns to a fresh login form", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/session") && init?.method === "DELETE") return Response.json({ ok: true });
      if (String(input).includes("/session")) return Response.json({ ok: true, lawyer });
      if (String(input).includes("/requests")) return Response.json({ ok: true, requests: requestLists });
      return Response.json({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);
    const dictionary = renderPortal();

    fireEvent.click(await screen.findByRole("button", { name: dictionary.portal.lawyerAuth.signOut }));

    await waitFor(() => expect(screen.getByLabelText(dictionary.portal.lawyerAuth.password)).toHaveValue(""));
  });
});
