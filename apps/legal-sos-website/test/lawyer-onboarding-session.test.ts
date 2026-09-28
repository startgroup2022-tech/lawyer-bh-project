import { describe, expect, it } from "vitest";

import {
  assertSameOrigin,
  onboardingCookieName,
  readOnboardingCookie,
  serializeOnboardingCookie,
} from "@/lib/lawyer-onboarding-session";

describe("LegalSOS lawyer onboarding session", () => {
  it("uses a host-only secure cookie in HTTPS environments", () => {
    const request = new Request("https://legalsos.lawyer/api/lawyer/onboarding/verify");
    const serialized = serializeOnboardingCookie(request, "s".repeat(43));

    expect(onboardingCookieName(request)).toBe(
      "__Host-legalsos_lawyer_onboarding",
    );
    expect(serialized).toContain("HttpOnly");
    expect(serialized).toContain("Secure");
    expect(serialized).toContain("SameSite=Strict");
    expect(serialized).toContain("Path=/");
    expect(serialized).not.toContain("Domain=");
  });

  it("uses a local cookie name without Secure on localhost", () => {
    const request = new Request("http://localhost:3014/api/lawyer/onboarding/status", {
      headers: { cookie: `legalsos_lawyer_onboarding=${"s".repeat(43)}` },
    });

    expect(onboardingCookieName(request)).toBe("legalsos_lawyer_onboarding");
    expect(serializeOnboardingCookie(request, "s".repeat(43))).not.toContain(
      "Secure",
    );
    expect(readOnboardingCookie(request)).toBe("s".repeat(43));
  });

  it("rejects cross-origin write requests", () => {
    expect(() =>
      assertSameOrigin(
        new Request("https://legalsos.lawyer/api/lawyer/onboarding/start", {
          method: "POST",
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toThrowError(/ORIGIN_DENIED/);

    expect(() =>
      assertSameOrigin(
        new Request("https://legalsos.lawyer/api/lawyer/onboarding/start", {
          method: "POST",
          headers: { origin: "https://legalsos.lawyer" },
        }),
      ),
    ).not.toThrow();
  });
});
