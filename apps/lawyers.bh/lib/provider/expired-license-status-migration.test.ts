import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("expired license status repair migration", () => {
  it("repairs only expired-license rows that are not already suspended", () => {
    const sql = readFileSync(
      "drizzle/0111_repair_expired_license_status.sql",
      "utf8",
    );

    expect(sql).toMatch(/UPDATE\s+bahrain_lawyers[\s\S]+SET[\s\S]+status\s*=\s*'suspended'/);
    expect(sql).toMatch(/WHERE[\s\S]+suspension_type\s*=\s*'license_expired'/);
    expect(sql).toMatch(/status\s*<>\s*'suspended'/);
    expect(sql).not.toMatch(/suspension_type\s+IS\s+NOT\s+NULL/i);
  });
});
