import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST as login } from "@/app/api/lawyer-auth/login/route";
import { GET as session, DELETE as logout } from "@/app/api/lawyer-auth/session/route";
import { GET as requests } from "@/app/api/lawyer-auth/requests/route";
import { POST as forgotPassword } from "@/app/api/lawyer-auth/forgot-password/route";

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

function jsonRequest(path: string, body: unknown, origin = "https://www.legalsos.org") {
  return new Request(`https://www.legalsos.org${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

function cookieRequest(path: string, method = "GET", origin?: string) {
  const headers = new Headers({ cookie: "legalsos_lawyer_session=signed.token" });
  if (origin) headers.set("origin", origin);
  return new Request(`https://www.legalsos.org${path}`, { method, headers });
}

describe("LegalSOS lawyer auth routes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("exchanges valid credentials for an HttpOnly cookie without returning the token", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ success: true, data: { token: "signed.token" } }))
      .mockResolvedValueOnce(Response.json({ ok: true, lawyer }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await login(jsonRequest("/api/lawyer-auth/login", {
      countryCode: "bh",
      licenseNumber: " BH-100 ",
      password: "secret",
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toContain("legalsos_lawyer_session=signed.token");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")?.toLowerCase()).toContain("samesite=lax");
    expect(payload).toEqual({ ok: true, lawyer });
    expect(JSON.stringify(payload)).not.toContain("signed.token");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ pathname: "/api/lawyers/login" }),
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ pathname: "/api/mobile/lawyer/session" }),
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("authorization")).toBe("Bearer signed.token");
  });

  it("rejects malformed credentials before contacting the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await login(jsonRequest("/api/lawyer-auth/login", {
      countryCode: "BHR",
      licenseNumber: "",
      password: "",
    }));

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects cross-origin login, reset, and logout", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const loginResponse = await login(jsonRequest("/api/lawyer-auth/login", {
      countryCode: "BH", licenseNumber: "BH-100", password: "secret",
    }, "https://evil.example"));
    const resetResponse = await forgotPassword(jsonRequest("/api/lawyer-auth/forgot-password", {
      countryCode: "BH", identifier: "BH-100", locale: "ar",
    }, "https://evil.example"));
    const logoutResponse = await logout(cookieRequest(
      "/api/lawyer-auth/session", "DELETE", "https://evil.example",
    ));

    expect([loginResponse.status, resetResponse.status, logoutResponse.status]).toEqual([403, 403, 403]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes invalid credentials and never creates a cookie", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(
      { success: false, message: "Invalid login details", details: "private" },
      { status: 401 },
    )));

    const response = await login(jsonRequest("/api/lawyer-auth/login", {
      countryCode: "BH", licenseNumber: "BH-100", password: "wrong",
    }));

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toEqual({ ok: false, error: "INVALID_CREDENTIALS" });
  });

  it("does not create a session when safe profile validation fails", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json({ success: true, data: { token: "signed.token" } }))
      .mockResolvedValueOnce(Response.json({ ok: true, lawyer: { id: "incomplete" } })));

    const response = await login(jsonRequest("/api/lawyer-auth/login", {
      countryCode: "BH", licenseNumber: "BH-100", password: "secret",
    }));

    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toEqual({ ok: false, error: "SERVICE_UNAVAILABLE" });
  });

  it("requires a protected cookie for session and request reads", async () => {
    const sessionResponse = await session(new Request("https://www.legalsos.org/api/lawyer-auth/session"));
    const requestsResponse = await requests(new Request("https://www.legalsos.org/api/lawyer-auth/requests"));

    expect(sessionResponse.status).toBe(401);
    expect(requestsResponse.status).toBe(401);
  });

  it("reads the safe session using only the server cookie token", async () => {
    const fetchMock = vi.fn(async (...args: [URL, RequestInit]) => {
      void args;
      return Response.json({ ok: true, lawyer });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await session(cookieRequest("/api/lawyer-auth/session"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, lawyer });
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer signed.token");
  });

  it("clears an invalid session cookie", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    )));

    const response = await session(cookieRequest("/api/lawyer-auth/session"));

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toContain("legalsos_lawyer_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("sanitizes lawyer request lists", async () => {
    const fetchMock = vi.fn(async (...args: [URL, RequestInit]) => {
      void args;
      return Response.json({
        advocateOnline: true,
        now: "2026-09-24T10:00:00.000Z",
        pickups: [{
          id: "new-1", caseRef: "SOS-1", caseType: "arrest", baseFeeBhd: 150,
          createdAtIso: "2026-09-24T09:00:00.000Z", lawyerResponseDeadlineIso: null,
          dispatchToken: "private",
        }],
        activeCases: [],
        completedCases: [],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await requests(cookieRequest("/api/lawyer-auth/requests"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.requests.newOffers).toHaveLength(1);
    expect(JSON.stringify(payload)).not.toContain("dispatchToken");
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer signed.token");
  });

  it("keeps request failures retryable without clearing the valid session", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("gateway error", { status: 502 })));

    const response = await requests(cookieRequest("/api/lawyer-auth/requests"));

    expect(response.status).toBe(502);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toEqual({ ok: false, error: "REQUESTS_UNAVAILABLE" });
  });

  it("logs out idempotently by expiring the cookie", async () => {
    const response = await logout(new Request("https://www.legalsos.org/api/lawyer-auth/session", {
      method: "DELETE",
      headers: { origin: "https://www.legalsos.org" },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("legalsos_lawyer_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("forwards password reset without enumerating the account", async () => {
    const fetchMock = vi.fn(async (...args: [URL, RequestInit]) => {
      void args;
      return Response.json({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await forgotPassword(jsonRequest("/api/lawyer-auth/forgot-password", {
      countryCode: "sa", identifier: " SA-100 ", locale: "tr",
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      countryCode: "SA", identifier: "SA-100", lang: "en",
    });
  });
});
