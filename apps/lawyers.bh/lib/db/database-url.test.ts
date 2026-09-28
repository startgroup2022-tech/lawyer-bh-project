import { describe, expect, it } from "vitest";
import { pickDatabaseUrl } from "./database-url";
import { readFileSync } from "node:fs";

describe("database URL selection", () => {
  it("skips hidden or malformed values and selects the first valid PostgreSQL URL", () => {
    expect(pickDatabaseUrl([
      "[SENSITIVE]",
      "not-a-url",
      "postgresql://user:pass@db.example.com/app",
      "postgresql://other:pass@other.example.com/app",
    ])).toBe("postgresql://user:pass@db.example.com/app");
  });

  it("throws a safe error when no database URL is valid", () => {
    expect(() => pickDatabaseUrl([undefined, "[SENSITIVE]"]))
      .toThrow(/No valid PostgreSQL database URL is configured/);
  });

  it("runs the observable migration wrapper before every production build", () => {
    const packageJson = readFileSync(new URL("../../package.json", import.meta.url), "utf8");
    expect(packageJson).toContain('"build": "node scripts/run-migrations.mjs && next build"');
  });
});
