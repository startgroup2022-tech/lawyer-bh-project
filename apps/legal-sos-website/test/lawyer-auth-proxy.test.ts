import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  LAWYER_SESSION_COOKIE,
  LAWYER_SESSION_MAX_AGE_SECONDS,
  fetchLawyerBackend,
  lawyerBackendUrl,
  lawyerCookieOptions,
  readLawyerToken,
  requireSameOrigin,
  sanitizeLawyerRequests,
  sanitizeLawyerSession,
} from "@/lib/lawyer-auth-proxy";

describe("LegalSOS lawyer auth proxy contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("defines a protected 30-day LegalSOS-only cookie", () => {
    expect(LAWYER_SESSION_COOKIE).toBe("legalsos_lawyer_session");
    expect(LAWYER_SESSION_MAX_AGE_SECONDS).toBe(60 * 60 * 24 * 30);
    expect(lawyerCookieOptions("production")).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 2_592_000,
    });
    expect(lawyerCookieOptions("development").secure).toBe(false);
  });

  it("reads only the named session cookie", () => {
    const request = new Request("https://legalsos.org/api/lawyer-auth/session", {
      headers: { cookie: "other=no; legalsos_lawyer_session=signed.token; ignored=yes" },
    });

    expect(readLawyerToken(request)).toBe("signed.token");
    expect(readLawyerToken(new Request(request.url))).toBeNull();
  });

  it("rejects cross-origin state changes and accepts same-origin requests", () => {
    expect(requireSameOrigin(new Request("https://legalsos.org/api/x", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    }))).toBe(false);
    expect(requireSameOrigin(new Request("https://legalsos.org/api/x", {
      method: "POST",
      headers: { origin: "https://legalsos.org" },
    }))).toBe(true);
    expect(requireSameOrigin(new Request("https://internal.vercel/api/x", {
      method: "POST",
      headers: {
        origin: "https://www.legalsos.org",
        "x-forwarded-host": "www.legalsos.org",
        "x-forwarded-proto": "https",
      },
    }))).toBe(true);
    expect(requireSameOrigin(new Request("https://legalsos.org/api/x", {
      method: "POST",
      headers: { "sec-fetch-site": "cross-site" },
    }))).toBe(false);
  });

  it("allows HTTPS backends and HTTP localhost only", () => {
    expect(lawyerBackendUrl("/api/mobile/lawyer/session").toString()).toBe(
      "https://www.lawyers.bh/api/mobile/lawyer/session",
    );
    vi.stubEnv("LEGAL_SOS_BACKEND_URL", "http://localhost:3000/path");
    expect(lawyerBackendUrl("/api/test").toString()).toBe("http://localhost:3000/api/test");
    vi.stubEnv("LEGAL_SOS_BACKEND_URL", "http://lawyers.example");
    expect(() => lawyerBackendUrl("/api/test")).toThrow("must use HTTPS");
  });

  it("forwards only an explicit server token as bearer authorization", async () => {
    const fetchMock = vi.fn(async (...args: [URL, RequestInit]) => {
      void args;
      return Response.json({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchLawyerBackend("/api/mobile/lawyer/session", { method: "GET" }, "signed.token");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://www.lawyers.bh/api/mobile/lawyer/session");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer signed.token");
    expect(new Headers(init?.headers).get("accept")).toBe("application/json");
    expect(init?.cache).toBe("no-store");
  });

  it("selects only the safe session fields", () => {
    expect(sanitizeLawyerSession({
      ok: true,
      lawyer: {
        id: "lawyer-1",
        countryCode: "sa",
        nameAr: "محامي اختبار",
        nameEn: "Test Lawyer",
        email: "lawyer@example.test",
        phone: "+966500000000",
        registrationNo: "SA-100",
        status: "approved",
        active: true,
        emergencyReady: true,
        isAvailable: true,
        image: null,
        rating: 4.8,
        totalRequests: 12,
        completedRequests: 9,
        passwordHash: "secret",
        ibanNumber: "secret",
      },
    })).toEqual({
      id: "lawyer-1",
      countryCode: "SA",
      nameAr: "محامي اختبار",
      nameEn: "Test Lawyer",
      email: "lawyer@example.test",
      phone: "+966500000000",
      registrationNo: "SA-100",
      status: "approved",
      active: true,
      emergencyReady: true,
      isAvailable: true,
      image: null,
      rating: 4.8,
      totalRequests: 12,
      completedRequests: 9,
    });
    expect(sanitizeLawyerSession({ ok: true, lawyer: { id: "x" } })).toBeNull();
  });

  it("sanitizes the three request lists and drops private fields", () => {
    const sanitized = sanitizeLawyerRequests({
      advocateOnline: true,
      now: "2026-09-24T10:00:00.000Z",
      pickups: [{
        id: "new-1",
        caseRef: "SOS-1",
        caseType: "arrest",
        baseFeeBhd: 150,
        createdAtIso: "2026-09-24T09:00:00.000Z",
        lawyerResponseDeadlineIso: "2026-09-24T09:05:00.000Z",
        dispatchToken: "private",
      }],
      activeCases: [{
        id: "active-1",
        caseRef: "SOS-2",
        caseType: "arrest",
        workflowType: "emergency_dispatch",
        contactName: "عميل",
        location: { lat: 26.1, lng: 50.5 },
        serviceStatus: "mobilizing",
        createdAtIso: "2026-09-24T08:00:00.000Z",
        clientPhone: "+97300000000",
      }],
      completedCases: [{
        id: "done-1",
        caseRef: "SOS-3",
        caseType: "arrest",
        workflowType: "emergency_dispatch",
        serviceStatus: "completed",
        createdAtIso: "2026-09-23T08:00:00.000Z",
        completedAtIso: "2026-09-23T09:00:00.000Z",
        description: "private",
        contactName: "private",
        location: { lat: 1, lng: 2 },
      }],
    });

    expect(sanitized).toEqual({
      advocateOnline: true,
      now: "2026-09-24T10:00:00.000Z",
      newOffers: [{
        id: "new-1",
        caseRef: "SOS-1",
        caseType: "arrest",
        baseFeeBhd: 150,
        createdAt: "2026-09-24T09:00:00.000Z",
        deadline: "2026-09-24T09:05:00.000Z",
      }],
      activeCases: [{
        id: "active-1",
        caseRef: "SOS-2",
        caseType: "arrest",
        workflowType: "emergency_dispatch",
        contactName: "عميل",
        location: { lat: 26.1, lng: 50.5 },
        serviceStatus: "mobilizing",
        createdAt: "2026-09-24T08:00:00.000Z",
      }],
      completedCases: [{
        id: "done-1",
        caseRef: "SOS-3",
        caseType: "arrest",
        workflowType: "emergency_dispatch",
        serviceStatus: "completed",
        createdAt: "2026-09-23T08:00:00.000Z",
        completedAt: "2026-09-23T09:00:00.000Z",
      }],
    });
    expect(JSON.stringify(sanitized)).not.toContain("private");
    expect(sanitizeLawyerRequests({ pickups: "bad" })).toBeNull();
  });
});
