import { describe, expect, it } from "vitest";

import { parseLiveLocationReport } from "./live-location-contract";

const now = new Date("2026-08-12T12:00:00.000Z");

describe("live lawyer location report contract", () => {
  it("accepts a complete recent Bahrain location", () => {
    expect(
      parseLiveLocationReport(
        {
          latitude: 26.2235,
          longitude: 50.5876,
          accuracy: 8.4,
          reportedAt: "2026-08-12T11:59:30.000Z",
        },
        now,
      ),
    ).toEqual({
      latitude: 26.2235,
      longitude: 50.5876,
      accuracy: 8.4,
      reportedAt: new Date("2026-08-12T11:59:30.000Z"),
    });
  });

  it("rejects invalid coordinates and accuracy", () => {
    expect(() =>
      parseLiveLocationReport(
        {
          latitude: 100,
          longitude: 50,
          accuracy: 5,
          reportedAt: now.toISOString(),
        },
        now,
      ),
    ).toThrow("invalid_coordinates");
    expect(() =>
      parseLiveLocationReport(
        {
          latitude: 26,
          longitude: 50,
          accuracy: -1,
          reportedAt: now.toISOString(),
        },
        now,
      ),
    ).toThrow("invalid_accuracy");
  });

  it("rejects device timestamps older than ten minutes or over two minutes ahead", () => {
    expect(() =>
      parseLiveLocationReport(
        {
          latitude: 26,
          longitude: 50,
          accuracy: 5,
          reportedAt: "2026-08-12T11:49:59.999Z",
        },
        now,
      ),
    ).toThrow("invalid_reported_at");
    expect(() =>
      parseLiveLocationReport(
        {
          latitude: 26,
          longitude: 50,
          accuracy: 5,
          reportedAt: "2026-08-12T12:02:00.001Z",
        },
        now,
      ),
    ).toThrow("invalid_reported_at");
  });
});
