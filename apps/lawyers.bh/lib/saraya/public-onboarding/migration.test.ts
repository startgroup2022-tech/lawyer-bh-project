import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "drizzle/0123_saraya_public_onboarding_audit.sql";
const verifyPath = "drizzle/verify_0123_saraya_public_onboarding_audit.sql";
const migration = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";
const verify = existsSync(verifyPath) ? readFileSync(verifyPath, "utf8") : "";
const schema = readFileSync("lib/db/saraya-schema.ts", "utf8");
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as {
  entries: Array<{ idx: number; tag: string; when: number }>;
};

describe("0122 Saraya public onboarding audit", () => {
  it("adds a dedicated non-property auth audit table without OTP or identity columns", () => {
    expect(migration).toContain('CREATE TABLE "saraya_auth_audit_logs"');
    expect(migration).toContain('"challenge_id" uuid');
    expect(migration).toContain('"user_id" uuid');
    expect(migration).toContain('"event" varchar(64) NOT NULL');
    expect(migration).toContain('"outcome" varchar(24) NOT NULL');
    expect(migration).toContain('"ip_address" text');
    expect(migration).toContain('"user_agent" varchar(256)');
    expect(migration).not.toContain("token_hash");
    expect(migration).not.toContain("normalized_email");
    expect(migration).not.toContain("normalized_phone");
    expect(schema).toContain("sarayaAuthAuditLogs");
  });

  it("verifies constraints, indexes, and registers after 0121", () => {
    expect(verify).toContain("saraya_auth_audit_logs_event_check");
    expect(verify).toContain("saraya_auth_audit_logs_outcome_check");
    expect(verify).toContain("saraya_auth_audit_logs_challenge_created_idx");
    const previous = journal.entries.find((entry) => entry.tag === "0122_saraya_public_rental_checkout");
    const current = journal.entries.find((entry) => entry.tag === "0123_saraya_public_onboarding_audit");
    expect(current).toEqual(expect.objectContaining({ idx: 123 }));
    expect(current!.when).toBeGreaterThan(previous!.when);
  });
});
