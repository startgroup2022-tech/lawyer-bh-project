import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const configuredUrl = process.env.DATABASE_URL;
const localUrl =
  configuredUrl &&
  ["127.0.0.1", "localhost"].includes(new URL(configuredUrl).hostname)
    ? configuredUrl
    : null;

// Drizzle's postgres-js driver replaces the client's date/json serializers with
// identity functions, so any raw `sqlClient` template that binds a JS Date
// throws ERR_INVALID_ARG_TYPE before it reaches the server. These functions
// take Date arguments and bind them directly, so they only work if the
// timestamp is converted to an ISO string first.
describe.skipIf(!localUrl)("lawyer onboarding rate limit writes real timestamps", () => {
  let store: typeof import("./lawyer-onboarding-store");
  let sqlClient: typeof import("@/lib/db/client")["sqlClient"];
  const buckets: string[] = [];

  beforeAll(async () => {
    store = await import("./lawyer-onboarding-store");
    ({ sqlClient } = await import("@/lib/db/client"));
  });

  afterAll(async () => {
    if (buckets.length) {
      await sqlClient`DELETE FROM legalsos_lawyer_onboarding_rate_limits WHERE bucket = ANY(${sqlClient.array(buckets)})`;
    }
  });

  it("increments within the window and resets after it", async () => {
    const bucket = `it-${randomUUID()}`;
    buckets.push(bucket);
    const now = new Date();

    expect(await store.incrementLawyerOnboardingRateLimit(bucket, now, 60_000)).toBe(1);
    expect(await store.incrementLawyerOnboardingRateLimit(bucket, now, 60_000)).toBe(2);

    const [row] = await sqlClient<{ window_started_at: string }[]>`
      SELECT window_started_at FROM legalsos_lawyer_onboarding_rate_limits WHERE bucket = ${bucket}
    `;
    expect(new Date(row.window_started_at).getTime()).toBe(now.getTime());

    // A later window must start counting from one again.
    const later = new Date(now.getTime() + 120_000);
    expect(await store.incrementLawyerOnboardingRateLimit(bucket, later, 60_000)).toBe(1);
  });

  it("prunes rows older than the cutoff", async () => {
    const bucket = `it-${randomUUID()}`;
    buckets.push(bucket);

    await store.incrementLawyerOnboardingRateLimit(bucket, new Date(), 60_000);
    await store.pruneLawyerOnboardingRateLimits(new Date(Date.now() + 60_000));

    const rows = await sqlClient<{ bucket: string }[]>`
      SELECT bucket FROM legalsos_lawyer_onboarding_rate_limits WHERE bucket = ${bucket}
    `;
    expect(rows).toHaveLength(0);
  });
});
