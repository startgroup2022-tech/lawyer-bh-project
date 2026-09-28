import { beforeEach, describe, expect, it } from "vitest";

import {
  createProviderSessionValue,
  getProviderSessionFromRequest,
  PROVIDER_SESSION_COOKIE,
} from "./_session";

function requestWithCookie(value: string) {
  return {
    cookies: {
      get(name: string) {
        return name === PROVIDER_SESSION_COOKIE ? { value } : undefined;
      },
    },
  } as never;
}

describe("KSA provider session", () => {
  beforeEach(() => {
    process.env.LAWYER_AUTH_SECRET = "ksa-session-test-secret";
  });

  it("creates Saudi sessions when country is omitted", () => {
    expect(createProviderSessionValue("lawyer-1")).toMatch(/^SA:lawyer-1\./);
  });

  it("refuses to create a Bahrain provider session", () => {
    expect(() => createProviderSessionValue("lawyer-1", "BH")).toThrowError(
      "KSA_SESSION_REQUIRED",
    );
  });

  it("decodes a signed Saudi session", () => {
    const value = createProviderSessionValue("lawyer-1", "SA");
    expect(getProviderSessionFromRequest(requestWithCookie(value))).toEqual({
      providerId: "lawyer-1",
      countryCode: "SA",
    });
  });
});
