import { describe, expect, it } from "vitest";

import { createStartLawyerOnboardingHandler } from "./route";

function validRequest(body: Record<string, unknown> = {}) {
  return new Request("https://www.lawyers.bh/api/legalsos/lawyers/onboarding/start", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "192.0.2.10",
      "user-agent": "vitest",
    },
    body: JSON.stringify({
      countryCode: "BH",
      fullName: " أحمد المحامي ",
      email: " Lawyer@Example.COM ",
      professionalIdentifier: " ١٢ ٣٤٥ ",
      locale: "ar",
      ...body,
    }),
  });
}

describe("POST LegalSOS lawyer onboarding start", () => {
  it("normalizes the three fields and sends a one-use verification link", async () => {
    const events: Array<{ type: string; value: unknown }> = [];
    const handler = createStartLawyerOnboardingHandler({
      ensureCountry: async (code) => (code === "BH" ? { code: "BH" } : null),
      checkRateLimit: async (operation, ipAddress, email) => {
        events.push({ type: "limit", value: { operation, ipAddress, email } });
      },
      begin: async (input) => {
        events.push({ type: "begin", value: input });
        return { shouldDeliver: true };
      },
      sendVerification: async (input) => {
        events.push({ type: "email", value: input });
      },
      createToken: () => "v".repeat(43),
      now: () => new Date("2026-09-27T08:00:00.000Z"),
      websiteOrigin: "https://legalsos.lawyer",
    });

    const response = await handler(validRequest());

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true, nextStep: "check_email" });
    expect(events).toContainEqual({
      type: "begin",
      value: expect.objectContaining({
        countryCode: "BH",
        fullName: "أحمد المحامي",
        email: "lawyer@example.com",
        professionalIdentifier: "12345",
        locale: "ar",
        verificationTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        verificationExpiresAt: new Date("2026-09-27T08:30:00.000Z"),
      }),
    });
    expect(events).toContainEqual({
      type: "email",
      value: expect.objectContaining({
        to: "lawyer@example.com",
        verificationUrl:
          "https://legalsos.lawyer/ar/lawyer/register?token=" + "v".repeat(43),
      }),
    });
  });

  it("returns the same accepted response when no email should be delivered", async () => {
    let delivered = false;
    const handler = createStartLawyerOnboardingHandler({
      ensureCountry: async () => ({ code: "BH" }),
      checkRateLimit: async () => undefined,
      begin: async () => ({ shouldDeliver: false }),
      sendVerification: async () => {
        delivered = true;
      },
      createToken: () => "v".repeat(43),
      now: () => new Date("2026-09-27T08:00:00.000Z"),
      websiteOrigin: "https://legalsos.lawyer",
    });

    const response = await handler(validRequest());

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true, nextStep: "check_email" });
    expect(delivered).toBe(false);
  });

  it("rejects malformed quick-registration fields", async () => {
    const handler = createStartLawyerOnboardingHandler({
      ensureCountry: async () => ({ code: "BH" }),
      checkRateLimit: async () => undefined,
      begin: async () => ({ shouldDeliver: true }),
      sendVerification: async () => undefined,
      createToken: () => "v".repeat(43),
      now: () => new Date("2026-09-27T08:00:00.000Z"),
      websiteOrigin: "https://legalsos.lawyer",
    });

    const response = await handler(validRequest({ email: "not-an-email" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, code: "INVALID_INPUT" });
  });
});
