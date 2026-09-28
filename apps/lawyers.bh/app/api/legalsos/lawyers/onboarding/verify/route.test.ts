import { describe, expect, it } from "vitest";

import { createVerifyLawyerOnboardingHandler } from "./route";

const state = {
  id: "00000000-0000-4000-8000-000000000001",
  countryCode: "BH",
  fullName: "أحمد المحامي",
  email: "lawyer@example.com",
  professionalIdentifier: "12345",
  locale: "ar" as const,
  status: "profile_incomplete" as const,
  linkedLawyerId: null,
};

describe("POST LegalSOS lawyer onboarding verify", () => {
  it("consumes the email token and returns a resumable onboarding token", async () => {
    const calls: unknown[] = [];
    const handler = createVerifyLawyerOnboardingHandler({
      verify: async (input) => {
        calls.push(input);
        return state;
      },
      createToken: () => "s".repeat(43),
      now: () => new Date("2026-09-27T08:00:00.000Z"),
    });

    const response = await handler(
      new Request("https://www.lawyers.bh/api/onboarding/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "v".repeat(43) }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      onboardingAccessToken: "s".repeat(43),
      state,
    });
    expect(calls).toEqual([
      expect.objectContaining({
        verificationToken: "v".repeat(43),
        sessionTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        sessionExpiresAt: new Date("2026-10-04T08:00:00.000Z"),
      }),
    ]);
  });

  it("returns one stable error for used, unknown, or expired links", async () => {
    const handler = createVerifyLawyerOnboardingHandler({
      verify: async () => null,
      createToken: () => "s".repeat(43),
      now: () => new Date("2026-09-27T08:00:00.000Z"),
    });

    const response = await handler(
      new Request("https://www.lawyers.bh/api/onboarding/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "v".repeat(43) }),
      }),
    );

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      ok: false,
      code: "LINK_INVALID_OR_EXPIRED",
    });
  });
});
