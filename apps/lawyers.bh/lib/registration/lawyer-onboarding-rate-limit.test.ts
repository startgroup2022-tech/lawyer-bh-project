import { describe, expect, it } from "vitest";

import { createLawyerOnboardingRateLimiter } from "./lawyer-onboarding-rate-limit";

describe("lawyer onboarding rate limiter", () => {
  it("blocks the sixth attempt from the same IP without storing the raw IP", async () => {
    const counts = new Map<string, number>();
    const limiter = createLawyerOnboardingRateLimiter({
      increment: async (bucket) => {
        const count = (counts.get(bucket) ?? 0) + 1;
        counts.set(bucket, count);
        return count;
      },
      prune: async () => undefined,
      now: () => new Date("2026-09-27T08:00:00.000Z"),
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await limiter.check("start", "192.0.2.10", "lawyer@example.com");
    }

    await expect(
      limiter.check("start", "192.0.2.10", "other@example.com"),
    ).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429 });
    expect([...counts.keys()].join(" ")).not.toContain("192.0.2.10");
  });

  it("normalizes email before applying the identity limit", async () => {
    const counts = new Map<string, number>();
    const limiter = createLawyerOnboardingRateLimiter({
      increment: async (bucket) => {
        const count = (counts.get(bucket) ?? 0) + 1;
        counts.set(bucket, count);
        return count;
      },
      now: () => new Date("2026-09-27T08:00:00.000Z"),
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await limiter.check(
        "resend",
        `192.0.2.${attempt + 1}`,
        attempt % 2 === 0 ? " Lawyer@Example.COM " : "lawyer@example.com",
      );
    }

    await expect(
      limiter.check("resend", "198.51.100.2", "LAWYER@example.com"),
    ).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429 });
  });
});
