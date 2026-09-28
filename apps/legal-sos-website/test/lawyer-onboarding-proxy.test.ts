import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as start } from "@/app/api/lawyer/onboarding/start/route";
import { POST as verify } from "@/app/api/lawyer/onboarding/verify/route";
import { GET as status } from "@/app/api/lawyer/onboarding/status/route";
import { POST as submit } from "@/app/api/lawyer/onboarding/submit/route";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("LegalSOS lawyer onboarding proxy", () => {
  it("forwards quick registration without browser authorization", async () => {
    vi.stubEnv("LEGAL_SOS_BACKEND_URL", "https://www.lawyers.bh");
    const observed: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      observed.push({ url, init });
      return Response.json(
        { ok: true, nextStep: "check_email" },
        { status: 202 },
      );
    });

    const response = await start(
      new Request("https://legalsos.lawyer/api/lawyer/onboarding/start", {
        method: "POST",
        headers: {
          origin: "https://legalsos.lawyer",
          authorization: "Bearer browser-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ email: "lawyer@example.com" }),
      }),
    );

    expect(response.status).toBe(202);
    expect(observed[0]?.url).toBe(
      "https://www.lawyers.bh/api/legalsos/lawyers/onboarding/start",
    );
    expect(new Headers(observed[0]?.init?.headers).has("authorization")).toBe(false);
  });

  it("stores the backend access token only in an HTTP-only cookie", async () => {
    vi.stubEnv("LEGAL_SOS_BACKEND_URL", "https://www.lawyers.bh");
    vi.stubGlobal("fetch", async () =>
      Response.json({
        ok: true,
        onboardingAccessToken: "s".repeat(43),
        state: { status: "profile_incomplete" },
      }),
    );

    const response = await verify(
      new Request("https://legalsos.lawyer/api/lawyer/onboarding/verify", {
        method: "POST",
        headers: {
          origin: "https://legalsos.lawyer",
          "content-type": "application/json",
        },
        body: JSON.stringify({ token: "v".repeat(43) }),
      }),
    );
    const body = await response.json();

    expect(body.onboardingAccessToken).toBeUndefined();
    expect(body.state.status).toBe("profile_incomplete");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain(
      "__Host-legalsos_lawyer_onboarding",
    );
  });

  it("forwards only the cookie token to status and clears it after submission", async () => {
    vi.stubEnv("LEGAL_SOS_BACKEND_URL", "https://www.lawyers.bh");
    const observedAuthorization: string[] = [];
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      observedAuthorization.push(
        new Headers(init?.headers).get("authorization") ?? "",
      );
      return Response.json({
        ok: true,
        status: "pending",
        isActive: false,
        nextStep: "pending_approval",
      });
    });
    const cookie = `__Host-legalsos_lawyer_onboarding=${"s".repeat(43)}`;

    const statusResponse = await status(
      new Request("https://legalsos.lawyer/api/lawyer/onboarding/status", {
        headers: { cookie },
      }),
    );

    const form = new FormData();
    form.set("fullNameEn", "Ahmed Verified");
    const submitResponse = await submit(
      new Request("https://legalsos.lawyer/api/lawyer/onboarding/submit", {
        method: "POST",
        headers: { cookie, origin: "https://legalsos.lawyer" },
        body: form,
      }),
    );

    expect(statusResponse.status).toBe(200);
    expect(submitResponse.status).toBe(200);
    expect(observedAuthorization).toEqual([
      `Bearer ${"s".repeat(43)}`,
      `Bearer ${"s".repeat(43)}`,
    ]);
    expect(submitResponse.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
