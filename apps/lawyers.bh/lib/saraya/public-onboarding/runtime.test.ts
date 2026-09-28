import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSession: vi.fn(async () => ({ accessToken: "access", refreshToken: "refresh" })),
  hashPassword: vi.fn(async () => "password-hash"),
  sendEmail: vi.fn(async () => undefined),
  repository: {
    rateLimit: vi.fn(async () => undefined),
    createChallenge: vi.fn(async (input: { challengeId: string; expiresAt: Date }) => ({
      challengeId: input.challengeId,
      expiresAt: input.expiresAt,
    })),
    findChallengeIdentity: vi.fn(async () => ({
      normalizedEmail: "tenant@example.com",
      normalizedPhone: null,
    })),
    verifyAndCreateSession: vi.fn(async (input: {
      createPasswordHash(): Promise<string>;
      createSession(userId: string, context: unknown): Promise<{ accessToken: string; refreshToken: string }>;
    }) => ({
      status: "verified" as const,
      userId: "user-1",
      reused: false,
      ...await input.createSession("user-1", { sessions: {}, loadUser: vi.fn() }),
    })),
    markDelivery: vi.fn(async () => undefined),
    recordAudit: vi.fn(async () => undefined),
  },
}));

vi.mock("../auth/runtime", () => ({
  createSarayaSessions: vi.fn(() => ({ create: mocks.createSession })),
}));
vi.mock("../auth/passwords", () => ({ hashPassword: mocks.hashPassword }));
vi.mock("./delivery", () => ({
  createPublicOnboardingDelivery: vi.fn(() => ({
    sendEmail: mocks.sendEmail,
    sendSms: vi.fn(async () => undefined),
  })),
}));
vi.mock("./repository", () => ({
  publicOnboardingRepository: mocks.repository,
}));

describe("Saraya public onboarding runtime wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SARAYA_PUBLIC_OTP_SECRET = "runtime-otp-secret-that-is-at-least-32";
  });

  afterEach(() => {
    delete process.env.SARAYA_PUBLIC_OTP_SECRET;
  });

  it("wires the actual challenge runtime through delivery and persistence", async () => {
    const { publicOnboardingHandlers } = await import("./runtime");
    const response = await publicOnboardingHandlers.challenge(new Request(
      "https://sq.lawyers.bh/api/saraya/v1/public/onboarding/challenge",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-vercel-forwarded-for": "203.0.113.42",
        },
        body: JSON.stringify({
          channel: "email",
          identity: "tenant@example.com",
          locale: "en",
        }),
      },
    ));

    expect(response.status).toBe(202);
    expect(mocks.repository.createChallenge).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.repository.markDelivery).toHaveBeenCalledWith(
      expect.any(String),
      "sent",
      expect.objectContaining({ ip: "203.0.113.42" }),
      expect.any(Date),
    );
  });

  it("wires atomic session creation through the existing Saraya session factory", async () => {
    const { publicOnboardingHandlers } = await import("./runtime");
    const response = await publicOnboardingHandlers.verify(new Request(
      "https://sq.lawyers.bh/api/saraya/v1/public/onboarding/verify",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-vercel-forwarded-for": "203.0.113.42",
          "x-saraya-client": "native",
        },
        body: JSON.stringify({
          challengeId: "11111111-1111-4111-8111-111111111111",
          code: "482193",
          displayNameAr: "مستأجر",
          displayNameEn: "Tenant",
        }),
      },
    ));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      userId: "user-1",
      accessToken: "access",
      refreshToken: "refresh",
    });
    expect(mocks.repository.verifyAndCreateSession).toHaveBeenCalledTimes(1);
    expect(mocks.createSession).toHaveBeenCalledWith("user-1");
  });
});
