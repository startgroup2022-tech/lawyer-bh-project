import { describe, expect, it } from "vitest";

import { resolveTrackingState } from "./tracking-state";

const now = new Date("2026-09-04T12:00:00.000Z");

describe("resolveTrackingState", () => {
  it("returns live only for a fresh mobilizing report", () => {
    expect(resolveTrackingState("mobilizing", "2026-09-04T11:59:00.000Z", now)).toEqual({
      state: "live",
      reportedAt: "2026-09-04T11:59:00.000Z",
      freshUntil: "2026-09-04T12:04:00.000Z",
    });
  });

  it("returns stale at the freshness boundary", () => {
    expect(resolveTrackingState("mobilizing", "2026-09-04T11:55:00.000Z", now).state).toBe("stale");
  });

  it("distinguishes a missing first report from inactive service", () => {
    expect(resolveTrackingState("mobilizing", null, now).state).toBe("waiting");
    expect(resolveTrackingState("completed", "2026-09-04T11:59:00.000Z", now).state).toBe("inactive");
  });
});
