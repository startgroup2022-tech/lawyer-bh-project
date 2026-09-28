import { describe, expect, it } from "vitest";
import { sanitizePublicOnboardingContext } from "./audit";

describe("Saraya public onboarding audit sanitization", () => {
  it.each([
    ["203.0.113.42", "203.0.113.0/24"],
    ["2001:db8::1", "2001:db8:0:0::/64"],
    ["2001:0db8:abcd:0012:1111:2222:3333:4444", "2001:db8:abcd:12::/64"],
    ["::ffff:192.0.2.128", "0:0:0:0::/64"],
  ])("masks %s without retaining host bits", (ip, expected) => {
    expect(sanitizePublicOnboardingContext({ ip })).toEqual({
      ipAddress: expected,
      userAgent: null,
    });
  });

  it("does not accept an unsplit proxy chain as an IP address", () => {
    expect(sanitizePublicOnboardingContext({
      ip: "2001:db8::1, 10.0.0.1",
      userAgent: "Browser\nAgent",
    })).toEqual({
      ipAddress: "unavailable",
      userAgent: "Browser Agent",
    });
  });
});
