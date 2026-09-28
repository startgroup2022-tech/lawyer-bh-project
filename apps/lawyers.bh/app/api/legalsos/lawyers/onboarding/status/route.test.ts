import { describe, expect, it } from "vitest";

import { createReadLawyerOnboardingStatusHandler } from "./route";

describe("GET LegalSOS lawyer onboarding status", () => {
  it("returns the locked profile state for a valid bearer session", async () => {
    const handler = createReadLawyerOnboardingStatusHandler({
      readSession: async (token) =>
        token === "s".repeat(43)
          ? {
              id: "00000000-0000-4000-8000-000000000001",
              countryCode: "BH",
              fullName: "أحمد المحامي",
              email: "lawyer@example.com",
              professionalIdentifier: "12345",
              locale: "ar",
              status: "profile_incomplete",
              linkedLawyerId: null,
            }
          : null,
    });

    const response = await handler(
      new Request("https://www.lawyers.bh/api/onboarding/status", {
        headers: { authorization: `Bearer ${"s".repeat(43)}` },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      state: { status: "profile_incomplete", email: "lawyer@example.com" },
    });
  });

  it("rejects missing or expired sessions without leaking state", async () => {
    const handler = createReadLawyerOnboardingStatusHandler({
      readSession: async () => null,
    });

    const response = await handler(
      new Request("https://www.lawyers.bh/api/onboarding/status"),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      code: "ONBOARDING_SESSION_REQUIRED",
    });
  });
});
