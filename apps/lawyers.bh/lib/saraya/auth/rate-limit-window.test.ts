import { describe, expect, it } from "vitest";
import { rateLimitTimestamp } from "./rate-limit-window";

describe("Saraya auth rate-limit window", () => {
  it("serializes timestamps explicitly for PostgreSQL timestamptz comparisons", () => {
    expect(rateLimitTimestamp(new Date("2026-09-07T06:00:00.123Z")))
      .toBe("2026-09-07T06:00:00.123Z");
  });
});
