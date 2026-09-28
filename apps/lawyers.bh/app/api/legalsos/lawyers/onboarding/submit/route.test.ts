import { describe, expect, it } from "vitest";

import { createSubmitLawyerOnboardingHandler } from "./route";

const state = {
  id: "00000000-0000-4000-8000-000000000001",
  countryCode: "BH",
  fullName: "أحمد الموثق",
  email: "verified@example.com",
  professionalIdentifier: "12345",
  locale: "ar" as const,
  status: "profile_incomplete" as const,
  linkedLawyerId: null,
};

function request(authorized: boolean) {
  const form = new FormData();
  form.set("fullNameEn", "Ahmed Verified");
  return new Request("https://www.lawyers.bh/api/onboarding/submit", {
    method: "POST",
    headers: authorized
      ? { authorization: `Bearer ${"s".repeat(43)}` }
      : undefined,
    body: form,
  });
}

describe("POST LegalSOS lawyer onboarding submit", () => {
  it("requires a verified onboarding session", async () => {
    const handler = createSubmitLawyerOnboardingHandler({
      readSession: async () => null,
      submit: async () => Response.json({ ok: true }),
    });

    const response = await handler(request(false));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      code: "ONBOARDING_SESSION_REQUIRED",
    });
  });

  it("passes the verified identity to staged submission", async () => {
    const received: unknown[] = [];
    const handler = createSubmitLawyerOnboardingHandler({
      readSession: async () => state,
      submit: async (input) => {
        received.push(input.identity);
        return Response.json({
          ok: true,
          status: "pending",
          isActive: false,
          nextStep: "pending_approval",
        });
      },
    });

    const response = await handler(request(true));

    expect(response.status).toBe(200);
    expect(received).toEqual([
      {
        onboardingId: state.id,
        countryCode: "BH",
        locale: "ar",
        fullName: "أحمد الموثق",
        email: "verified@example.com",
        professionalIdentifier: "12345",
      },
    ]);
  });
});
