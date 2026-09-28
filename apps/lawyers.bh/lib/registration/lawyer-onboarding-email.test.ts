import { describe, expect, it } from "vitest";

import { buildLawyerOnboardingVerificationEmail } from "./lawyer-onboarding-email";

describe("lawyer onboarding verification email", () => {
  it("builds an Arabic verification email with the LegalSOS resume link", () => {
    const message = buildLawyerOnboardingVerificationEmail({
      to: "lawyer@example.com",
      fullName: "أحمد المحامي",
      locale: "ar",
      verificationUrl:
        "https://legalsos.lawyer/ar/lawyer/register?token=secure-token",
    });

    expect(message).toEqual(
      expect.objectContaining({
        to: "lawyer@example.com",
        subject: "أكمل تسجيلك كمحامي في LegalSOS",
      }),
    );
    expect(message.text).toContain("secure-token");
    expect(message.html).toContain('dir="rtl"');
    expect(message.html).toContain("secure-token");
  });

  it("escapes lawyer names before adding them to HTML", () => {
    const message = buildLawyerOnboardingVerificationEmail({
      to: "lawyer@example.com",
      fullName: '<img src=x onerror="alert(1)">',
      locale: "en",
      verificationUrl:
        "https://legalsos.lawyer/en/lawyer/register?token=secure-token",
    });

    expect(message.html).not.toContain("<img");
    expect(message.html).toContain("&lt;img");
    expect(message.subject).toBe("Complete your LegalSOS lawyer registration");
  });
});
