import { describe, expect, it } from "vitest";

import { toSqlTimestamp } from "./sql-timestamp";

describe("toSqlTimestamp", () => {
  it("serializes Date values before they cross the raw SQL boundary", () => {
    const value = toSqlTimestamp(new Date("2026-09-12T08:36:39.768Z"));

    expect(value).toBe("2026-09-12T08:36:39.768Z");
    expect(typeof value).toBe("string");
  });
});
