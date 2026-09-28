import { describe, expect, it } from "vitest";

import {
  formatBahrainDateTime,
  formatBahrainLongDateTime,
  formatBahrainTime,
} from "./bahrain-time";

describe("Bahrain SOS time formatting", () => {
  it("renders UTC request timestamps in Bahrain local time", () => {
    const timestamp = "2026-08-22T08:19:00.000Z";

    expect(formatBahrainTime(timestamp, "en-GB")).toBe("11:19");
    expect(formatBahrainDateTime(timestamp, "en-GB")).toContain("11:19");
    expect(formatBahrainLongDateTime(timestamp, "en-GB")).toBe(
      "22 Aug 2026, 11:19",
    );
  });
});
