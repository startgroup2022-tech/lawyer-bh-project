import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../auth/contracts";
import { createPublicOnboardingService } from "./service";
import type {
  PublicOnboardingDelivery,
  PublicOnboardingRepository,
} from "./contracts";

const now = new Date("2026-09-27T08:00:00.000Z");
const context = { ip: "203.0.113.10", userAgent: "vitest" };

function dependencies(overrides: Partial<PublicOnboardingRepository> = {}) {
  const repository: PublicOnboardingRepository = {
    rateLimit: vi.fn(async () => undefined),
    createChallenge: vi.fn(async (input) => ({
      challengeId: "challenge-1",
      expiresAt: input.expiresAt,
    })),
    findChallengeIdentity: vi.fn(async () => ({
      normalizedEmail: "tenant@example.com",
      normalizedPhone: null,
    })),
    verifyAndCreateSession: vi.fn(async (input) => ({
      status: "verified" as const,
      userId: "user-existing",
      reused: true,
      ...await input.createSession("user-existing", {} as never),
    })),
    markDelivery: vi.fn(async () => undefined),
    recordAudit: vi.fn(async () => undefined),
    ...overrides,
  };
  const delivery: PublicOnboardingDelivery = {
    sendEmail: vi.fn(async () => undefined),
    sendSms: vi.fn(async () => undefined),
  };
  const createSession = vi.fn(async () => ({
    accessToken: "access-token",
    refreshToken: "refresh-token",
  }));
  const hashPassword = vi.fn(async () => "random-password-hash");
  const randomPassword = vi.fn(() => "unexposed-random-password");
  const service = createPublicOnboardingService({
    repository,
    delivery,
    createSession,
    hashPassword,
    otpSecret: "otp-secret-that-is-at-least-32-characters",
    now: () => now,
    randomCode: () => "482193",
    randomChallengeId: () => "challenge-1",
    randomPassword,
  });
  return {
    service,
    repository,
    delivery,
    createSession,
    hashPassword,
    randomPassword,
  };
}

describe("Saraya public onboarding service", () => {
  it("normalizes exactly one email identity and stores only a keyed digest", async () => {
    const { service, repository, delivery } = dependencies();

    const result = await service.requestChallenge({
      channel: "email",
      identity: " Tenant@Example.COM ",
      locale: "ar",
    }, context);

    expect(result).toEqual({
      challengeId: "challenge-1",
      expiresAt: "2026-09-27T08:10:00.000Z",
    });
    expect(repository.createChallenge).toHaveBeenCalledWith(expect.objectContaining({
      normalizedEmail: "tenant@example.com",
      normalizedPhone: null,
      tokenDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
      expiresAt: new Date("2026-09-27T08:10:00.000Z"),
    }));
    expect(repository.createChallenge).not.toHaveBeenCalledWith(
      expect.objectContaining({ tokenDigest: "482193" }),
    );
    expect(delivery.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "tenant@example.com",
      code: "482193",
    }));
    expect(delivery.sendSms).not.toHaveBeenCalled();
  });

  it("accepts only an E.164 phone for the phone channel", async () => {
    const { service } = dependencies();

    await expect(service.requestChallenge({
      channel: "phone",
      identity: "39000000",
      locale: "en",
    }, context)).rejects.toMatchObject({ code: "INVALID_PHONE" });
  });

  it("rate limits challenge requests by IP and normalized identity", async () => {
    const { service, repository } = dependencies();

    await service.requestChallenge({
      channel: "email",
      identity: "Tenant@Example.com",
      locale: "en",
    }, context);

    expect(repository.rateLimit).toHaveBeenNthCalledWith(
      1,
      "public-onboarding:challenge:ip",
      context.ip,
      5,
      15 * 60_000,
      now,
    );
    expect(repository.rateLimit).toHaveBeenNthCalledWith(
      2,
      "public-onboarding:challenge:identity",
      "tenant@example.com",
      5,
      15 * 60_000,
      now,
    );
  });

  it("salts identical OTPs with a unique challenge id", async () => {
    const tokenDigests: string[] = [];
    const challengeIds = ["challenge-1", "challenge-2"];
    const repository = dependencies({
      createChallenge: vi.fn(async (input) => {
        tokenDigests.push(input.tokenDigest);
        return { challengeId: input.challengeId, expiresAt: input.expiresAt };
      }),
    });
    let index = 0;
    const service = createPublicOnboardingService({
      repository: repository.repository,
      delivery: repository.delivery,
      createSession: repository.createSession,
      hashPassword: vi.fn(async () => "random-password-hash"),
      otpSecret: "otp-secret-that-is-at-least-32-characters",
      now: () => now,
      randomCode: () => "482193",
      randomChallengeId: () => challengeIds[index++]!,
      randomPassword: () => "unexposed-random-password",
    });

    await service.requestChallenge({
      channel: "email",
      identity: "tenant@example.com",
      locale: "en",
    }, context);
    await service.requestChallenge({
      channel: "email",
      identity: "tenant@example.com",
      locale: "en",
    }, context);

    expect(tokenDigests).toHaveLength(2);
    expect(tokenDigests[0]).not.toBe(tokenDigests[1]);
  });

  it("reuses an existing account only after the OTP is valid", async () => {
    const { service, repository } = dependencies();

    const result = await service.verify({
      challengeId: "challenge-1",
      code: "482193",
      displayNameAr: "أحمد علي",
      displayNameEn: "Ahmed Ali",
    }, context);

    expect(result).toMatchObject({
      userId: "user-existing",
      reused: true,
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    expect(repository.verifyAndCreateSession).toHaveBeenCalledWith(expect.objectContaining({
      challengeId: "challenge-1",
      candidateDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
      createPasswordHash: expect.any(Function),
    }));
    expect(repository.verifyAndCreateSession).toHaveBeenCalledTimes(1);
  });

  it("creates one account for a verified new identity", async () => {
    const { service, repository, createSession } = dependencies({
      verifyAndCreateSession: vi.fn(async (input) => {
        await input.createPasswordHash();
        return {
          status: "verified" as const,
          userId: "user-new",
          reused: false,
          ...await input.createSession("user-new", {} as never),
        };
      }),
    });

    const result = await service.verify({
      challengeId: "challenge-2",
      code: "739201",
      displayNameAr: "شركة نور",
      displayNameEn: "Noor Company",
    }, context);

    expect(result).toMatchObject({ userId: "user-new", reused: false });
    expect(repository.verifyAndCreateSession).toHaveBeenCalledTimes(1);
    expect(createSession).toHaveBeenCalledWith("user-new", expect.anything());
  });

  it.each([
    ["invalid", 401, "OTP_INVALID_OR_EXPIRED"],
    ["expired", 401, "OTP_INVALID_OR_EXPIRED"],
    ["consumed", 401, "OTP_INVALID_OR_EXPIRED"],
    ["attempts_exhausted", 429, "RATE_LIMITED"],
  ] as const)("returns a generic error for %s verification", async (status, httpStatus, code) => {
    const { service } = dependencies({
      verifyAndCreateSession: vi.fn(async () => ({ status })),
    });

    await expect(service.verify({
      challengeId: "challenge-1",
      code: "000000",
      displayNameAr: "أحمد علي",
      displayNameEn: "Ahmed Ali",
    }, context)).rejects.toMatchObject({ status: httpStatus, code } satisfies Partial<ApiError>);
  });

  it("does not hash or generate credentials for an invalid OTP", async () => {
    const { service, hashPassword, randomPassword, createSession } = dependencies({
      verifyAndCreateSession: vi.fn(async () => ({ status: "invalid" as const })),
    });

    await expect(service.verify({
      challengeId: "challenge-1",
      code: "000000",
      displayNameAr: "أحمد علي",
      displayNameEn: "Ahmed Ali",
    }, context)).rejects.toMatchObject({ code: "OTP_INVALID_OR_EXPIRED" });

    expect(randomPassword).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each([
    { code: "abc", displayNameAr: "أحمد", displayNameEn: "Ahmed" },
    { code: "482193", displayNameAr: "", displayNameEn: "Ahmed" },
  ])("rate limits malformed verification before writing an audit", async (fields) => {
    const rateLimitError = new ApiError(
      429,
      "RATE_LIMITED",
      "محاولات كثيرة، حاول لاحقًا",
      "Too many attempts, try again later",
    );
    const { service, repository } = dependencies({
      rateLimit: vi.fn(async () => { throw rateLimitError; }),
    });

    await expect(service.verify({
      challengeId: "11111111-1111-4111-8111-111111111111",
      ...fields,
    }, context)).rejects.toMatchObject({ code: "RATE_LIMITED" });

    expect(repository.rateLimit).toHaveBeenCalledWith(
      "public-onboarding:verify:ip",
      context.ip,
      5,
      15 * 60_000,
      now,
    );
    expect(repository.recordAudit).not.toHaveBeenCalled();
  });

  it("bounds malformed verification audits with the IP rate limit", async () => {
    let ipAttempts = 0;
    const { service, repository } = dependencies({
      rateLimit: vi.fn(async (scope) => {
        if (scope !== "public-onboarding:verify:ip") return;
        ipAttempts += 1;
        if (ipAttempts > 5) {
          throw new ApiError(
            429,
            "RATE_LIMITED",
            "محاولات كثيرة، حاول لاحقًا",
            "Too many attempts, try again later",
          );
        }
      }),
    });

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await expect(service.verify({
        challengeId: "11111111-1111-4111-8111-111111111111",
        code: "bad",
        displayNameAr: "أحمد",
        displayNameEn: "Ahmed",
      }, context)).rejects.toBeInstanceOf(ApiError);
    }

    expect(repository.recordAudit).toHaveBeenCalledTimes(5);
  });

  it("returns the generic OTP error for an unknown valid challenge UUID", async () => {
    const { service, repository } = dependencies({
      findChallengeIdentity: vi.fn(async () => null),
    });

    await expect(service.verify({
      challengeId: "99999999-9999-4999-8999-999999999999",
      code: "482193",
      displayNameAr: "أحمد",
      displayNameEn: "Ahmed",
    }, context)).rejects.toMatchObject({
      status: 401,
      code: "OTP_INVALID_OR_EXPIRED",
    });
    expect(repository.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      challengeId: "99999999-9999-4999-8999-999999999999",
      reason: "invalid",
    }));
    expect(repository.verifyAndCreateSession).not.toHaveBeenCalled();
  });

  it("fails generically for a disabled existing account without creating credentials or a session", async () => {
    const { service, hashPassword, randomPassword, createSession } = dependencies({
      verifyAndCreateSession: vi.fn(async () => ({ status: "disabled" as const })),
    });

    await expect(service.verify({
      challengeId: "challenge-1",
      code: "482193",
      displayNameAr: "أحمد علي",
      displayNameEn: "Ahmed Ali",
    }, context)).rejects.toMatchObject({ code: "OTP_INVALID_OR_EXPIRED" });

    expect(randomPassword).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("rate limits verification by IP, challenge, and normalized identity", async () => {
    const { service, repository } = dependencies();

    await service.verify({
      challengeId: "challenge-1",
      code: "482193",
      displayNameAr: "أحمد علي",
      displayNameEn: "Ahmed Ali",
    }, context);

    expect(repository.rateLimit).toHaveBeenCalledWith(
      "public-onboarding:verify:ip", context.ip, 5, 15 * 60_000, now,
    );
    expect(repository.rateLimit).toHaveBeenCalledWith(
      "public-onboarding:verify:challenge", "challenge-1", 5, 10 * 60_000, now,
    );
    expect(repository.rateLimit).toHaveBeenCalledWith(
      "public-onboarding:verify:identity", "tenant@example.com", 5, 10 * 60_000, now,
    );
  });
});
