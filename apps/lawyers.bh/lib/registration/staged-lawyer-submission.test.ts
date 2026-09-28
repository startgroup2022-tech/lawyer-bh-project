import { describe, expect, it } from "vitest";

import { submitStagedLawyerApplication } from "./staged-lawyer-submission";

const identity = {
  onboardingId: "00000000-0000-4000-8000-000000000001",
  countryCode: "BH",
  locale: "ar" as const,
  fullName: "أحمد الموثق",
  email: "verified@example.com",
  professionalIdentifier: "12345",
};

function multipartRequest() {
  const form = new FormData();
  form.set("countryCode", "SA");
  form.set("fullNameAr", "اسم مزور");
  form.set("fullNameEn", "Ahmed Verified");
  form.set("email", "attacker@example.com");
  form.set("licenseNumber", "99999");
  form.set("subscriptionType", "consultant");
  return new Request("https://www.lawyers.bh/api/onboarding/submit", {
    method: "POST",
    body: form,
  });
}

describe("staged lawyer submission", () => {
  it("locks verified identity fields and leaves the completed profile pending", async () => {
    const linked: unknown[] = [];
    const response = await submitStagedLawyerApplication({
      request: multipartRequest(),
      identity,
      submitPending: async (request) => {
        const form = await request.formData();
        expect(Object.fromEntries(form.entries())).toMatchObject({
          countryCode: "BH",
          fullNameAr: "أحمد الموثق",
          fullNameEn: "Ahmed Verified",
          email: "verified@example.com",
          licenseNumber: "12345",
          subscriptionType: "lawyer",
          lang: "ar",
        });
        return Response.json({
          ok: true,
          id: "00000000-0000-4000-8000-000000000002",
          countryCode: "BH",
          status: "pending",
          profileCompleted: true,
        });
      },
      markSubmitted: async (input) => {
        linked.push(input);
      },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      status: "pending",
      profileCompleted: true,
      isActive: false,
      nextStep: "pending_approval",
    });
    expect(linked).toEqual([
      {
        onboardingId: identity.onboardingId,
        lawyerId: "00000000-0000-4000-8000-000000000002",
      },
    ]);
  });

  it("does not mark onboarding submitted when full validation fails", async () => {
    let linked = false;
    const response = await submitStagedLawyerApplication({
      request: multipartRequest(),
      identity,
      submitPending: async () =>
        Response.json({ ok: false, code: "INVALID_DOCUMENT" }, { status: 400 }),
      markSubmitted: async () => {
        linked = true;
      },
    });

    expect(response.status).toBe(400);
    expect(linked).toBe(false);
  });

  it("reconciles an already-created pending lawyer after an interrupted response", async () => {
    let submittedAgain = false;
    const linked: unknown[] = [];
    const response = await submitStagedLawyerApplication({
      request: multipartRequest(),
      identity,
      findExistingPending: async () => ({
        id: "00000000-0000-4000-8000-000000000003",
        countryCode: "BH",
      }),
      submitPending: async () => {
        submittedAgain = true;
        return Response.json({ ok: false }, { status: 500 });
      },
      markSubmitted: async (input) => {
        linked.push(input);
      },
    });

    expect(submittedAgain).toBe(false);
    expect(await response.json()).toMatchObject({
      status: "pending",
      isActive: false,
      nextStep: "pending_approval",
    });
    expect(linked).toEqual([
      {
        onboardingId: identity.onboardingId,
        lawyerId: "00000000-0000-4000-8000-000000000003",
      },
    ]);
  });
});
