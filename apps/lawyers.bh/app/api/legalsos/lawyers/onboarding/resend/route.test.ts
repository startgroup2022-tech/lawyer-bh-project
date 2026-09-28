import { describe, expect, it } from "vitest";

import { createResendLawyerOnboardingHandler } from "./route";

function request(body: Record<string, unknown>) {
  return new Request("https://www.lawyers.bh/api/onboarding/resend", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "192.0.2.20",
    },
    body: JSON.stringify(body),
  });
}

describe("POST LegalSOS lawyer onboarding resend", () => {
  it("rotates and sends a resume link for an incomplete profile", async () => {
    const delivered: unknown[] = [];
    const handler = createResendLawyerOnboardingHandler({
      checkRateLimit: async () => undefined,
      rotateVerification: async () => ({
        fullName: "أحمد المحامي",
        email: "lawyer@example.com",
        locale: "ar",
      }),
      sendVerification: async (input) => {
        delivered.push(input);
      },
      createToken: () => "v".repeat(43),
      now: () => new Date("2026-09-27T08:00:00.000Z"),
      websiteOrigin: "https://legalsos.lawyer",
    });

    const response = await handler(
      request({ countryCode: "BH", email: " Lawyer@Example.COM ", locale: "ar" }),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true });
    expect(delivered).toEqual([
      expect.objectContaining({
        to: "lawyer@example.com",
        verificationUrl:
          "https://legalsos.lawyer/ar/lawyer/register?token=" + "v".repeat(43),
      }),
    ]);
  });

  it("returns the same response when no eligible registration exists", async () => {
    let delivered = false;
    const handler = createResendLawyerOnboardingHandler({
      checkRateLimit: async () => undefined,
      rotateVerification: async () => null,
      sendVerification: async () => {
        delivered = true;
      },
      createToken: () => "v".repeat(43),
      now: () => new Date("2026-09-27T08:00:00.000Z"),
      websiteOrigin: "https://legalsos.lawyer",
    });

    const response = await handler(
      request({ countryCode: "BH", email: "unknown@example.com", locale: "en" }),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true });
    expect(delivered).toBe(false);
  });
});
