import { describe, expect, it } from "vitest";

import { parseCommunicationReport } from "./validation";

const idempotencyKey = "4dc4659a-8b87-4e8a-b123-495727e11111";

describe("communication report validation", () => {
  it.each([
    "harassment",
    "threat_or_hate",
    "fraud_or_spam",
    "sexual_or_inappropriate",
    "privacy",
    "other",
  ])("accepts the supported %s category", (category) => {
    expect(parseCommunicationReport({ category, idempotencyKey })).toEqual({
      category,
      description: null,
      idempotencyKey,
    });
  });

  it("trims an optional description and discards spoofed identities", () => {
    expect(
      parseCommunicationReport({
        category: "privacy",
        description: "  Shared my details  ",
        idempotencyKey,
        reporterId: "attacker-controlled",
        reportedId: "attacker-controlled",
      }),
    ).toEqual({
      category: "privacy",
      description: "Shared my details",
      idempotencyKey,
    });
  });

  it.each([
    [{ category: "unknown", idempotencyKey }, "invalid_report_category"],
    [{ category: "other", idempotencyKey: "not-a-uuid" }, "invalid_idempotency_key"],
    [{ category: "other", idempotencyKey, description: "x".repeat(1001) }, "invalid_report_description"],
  ])("rejects malformed input", (input, error) => {
    expect(() => parseCommunicationReport(input)).toThrow(error);
  });
});
