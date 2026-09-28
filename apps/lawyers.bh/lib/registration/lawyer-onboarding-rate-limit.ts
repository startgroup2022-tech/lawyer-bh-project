import { createHash } from "node:crypto";

import { normalizeOnboardingEmail } from "./lawyer-onboarding";

export class LawyerOnboardingRateLimitError extends Error {
  readonly code = "RATE_LIMITED";
  readonly status = 429;

  constructor() {
    super("Too many onboarding attempts");
  }
}

type RateLimiterDependencies = {
  increment(bucket: string, now: Date, windowMs: number): Promise<number>;
  prune?(before: Date): Promise<void>;
  now?: () => Date;
  limit?: number;
  windowMs?: number;
};

function bucket(scope: string, value: string) {
  const digest = createHash("sha256").update(value).digest("hex");
  return `${scope}:${digest}`;
}

export function createLawyerOnboardingRateLimiter(
  dependencies: RateLimiterDependencies,
) {
  const now = dependencies.now ?? (() => new Date());
  const limit = dependencies.limit ?? 5;
  const windowMs = dependencies.windowMs ?? 15 * 60_000;

  return {
    async check(operation: string, ipAddress: string, email: string) {
      const at = now();
      await dependencies.prune?.(new Date(at.getTime() - windowMs));

      const ipCount = await dependencies.increment(
        bucket(`${operation}:ip`, ipAddress),
        at,
        windowMs,
      );
      if (ipCount > limit) throw new LawyerOnboardingRateLimitError();

      const emailCount = await dependencies.increment(
        bucket(`${operation}:email`, normalizeOnboardingEmail(email)),
        at,
        windowMs,
      );
      if (emailCount > limit) throw new LawyerOnboardingRateLimitError();
    },
  };
}
