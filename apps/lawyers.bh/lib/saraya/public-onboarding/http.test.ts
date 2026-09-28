import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../auth/contracts";
import { createPublicOnboardingHandlers } from "./http";

const request = (path: string, body: unknown, headers: Record<string, string> = {}) => new Request(
  `https://sq.lawyers.bh${path}`,
  {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  },
);

function setupHandlers() {
  const service = {
    requestChallenge: vi.fn(async () => ({
      challengeId: "challenge-1",
      expiresAt: "2026-09-27T08:10:00.000Z",
    })),
    verify: vi.fn(async () => ({
      userId: "user-1",
      reused: false,
      accessToken: "access-token",
      refreshToken: "refresh-token",
    })),
  };
  return { handlers: createPublicOnboardingHandlers(service), service };
}

describe("Saraya public onboarding HTTP", () => {
  it("returns 202 for a challenge without exposing the OTP", async () => {
    const { handlers } = setupHandlers();
    const response = await handlers.challenge(request(
      "/api/saraya/v1/public/onboarding/challenge",
      { channel: "email", identity: "tenant@example.com", locale: "ar" },
      { "x-vercel-forwarded-for": "203.0.113.10" },
    ));

    expect(response.status).toBe(202);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({
      challengeId: "challenge-1",
      expiresAt: "2026-09-27T08:10:00.000Z",
    });
    expect(text).not.toContain("482193");
    expect(text.toLowerCase()).not.toContain("otp");
  });

  it("returns only a generic delivery error", async () => {
    const { handlers, service } = setupHandlers();
    service.requestChallenge.mockRejectedValueOnce(new ApiError(
      502,
      "CHALLENGE_DELIVERY_FAILED",
      "تعذر إرسال رمز التحقق",
      "Could not deliver verification code",
    ));

    const response = await handlers.challenge(request(
      "/api/saraya/v1/public/onboarding/challenge",
      { channel: "phone", identity: "+97339000000", locale: "en" },
      { "x-vercel-forwarded-for": "203.0.113.10" },
    ));
    const text = await response.text();

    expect(response.status).toBe(502);
    expect(text).toContain("CHALLENGE_DELIVERY_FAILED");
    expect(text).not.toContain("Postmark");
    expect(text).not.toContain("webhook");
    expect(text).not.toContain("39000000");
  });

  it.each([
    [401, "OTP_INVALID_OR_EXPIRED"],
    [429, "RATE_LIMITED"],
  ])("maps verification failures to %i", async (status, code) => {
    const { handlers, service } = setupHandlers();
    service.verify.mockRejectedValueOnce(new ApiError(
      status,
      code,
      "تعذر التحقق من الرمز",
      "Could not verify code",
    ));

    const response = await handlers.verify(request(
      "/api/saraya/v1/public/onboarding/verify",
      {
        challengeId: "challenge-1",
        code: "000000",
        displayNameAr: "أحمد علي",
        displayNameEn: "Ahmed Ali",
      },
      { "x-vercel-forwarded-for": "203.0.113.10" },
    ));

    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error: { code } });
  });

  it("creates an HttpOnly web session without returning the refresh token", async () => {
    const { handlers } = setupHandlers();
    const response = await handlers.verify(request(
      "/api/saraya/v1/public/onboarding/verify",
      {
        challengeId: "challenge-1",
        code: "482193",
        displayNameAr: "أحمد علي",
        displayNameEn: "Ahmed Ali",
      },
      { "x-vercel-forwarded-for": "203.0.113.10" },
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("__Host-saraya_refresh=refresh-token");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(body).toMatchObject({ accessToken: "access-token", userId: "user-1", reused: false });
    expect(body).not.toHaveProperty("refreshToken");
  });

  it("returns both session tokens to native clients", async () => {
    const { handlers } = setupHandlers();
    const response = await handlers.verify(request(
      "/api/saraya/v1/public/onboarding/verify",
      {
        challengeId: "challenge-1",
        code: "482193",
        displayNameAr: "أحمد علي",
        displayNameEn: "Ahmed Ali",
      },
      {
        "x-vercel-forwarded-for": "203.0.113.10",
        "x-saraya-client": "native",
      },
    ));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      userId: "user-1",
      reused: false,
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("does not log OTPs or identities on unhandled failures", async () => {
    const { handlers, service } = setupHandlers();
    service.verify.mockRejectedValueOnce(new Error("provider failed for 482193 tenant@example.com"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await handlers.verify(request(
      "/api/saraya/v1/public/onboarding/verify",
      {
        challengeId: "challenge-1",
        code: "482193",
        displayNameAr: "أحمد علي",
        displayNameEn: "Ahmed Ali",
      },
      { "x-vercel-forwarded-for": "203.0.113.10" },
    ));

    expect(response.status).toBe(500);
    expect(error).toHaveBeenCalledWith("[saraya-public-onboarding] unhandled error");
    expect(JSON.stringify(error.mock.calls)).not.toContain("482193");
    expect(JSON.stringify(error.mock.calls)).not.toContain("tenant@example.com");
    error.mockRestore();
  });

  it("uses only the first trusted proxy address", async () => {
    const { handlers, service } = setupHandlers();
    await handlers.verify(request(
      "/api/saraya/v1/public/onboarding/verify",
      {
        challengeId: "challenge-1",
        code: "482193",
        displayNameAr: "أحمد علي",
        displayNameEn: "Ahmed Ali",
      },
      { "x-vercel-forwarded-for": "2001:db8::1, 10.0.0.1" },
    ));

    expect(service.verify).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ ip: "2001:db8::1" }),
    );
  });
});
