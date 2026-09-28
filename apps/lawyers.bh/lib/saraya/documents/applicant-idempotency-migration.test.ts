import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("0127 applicant document idempotency migration", () => {
  it("persists a scoped stable key and full-payload fingerprint", () => {
    const migration = readFileSync("drizzle/0128_saraya_applicant_document_idempotency.sql", "utf8");
    const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: Array<{ idx: number; tag: string }> };
    expect(migration).toContain('"applicant_idempotency_key"');
    expect(migration).toContain('"applicant_fingerprint"');
    expect(migration).toContain('"uploaded_by_user_id", "unit_id", "applicant_idempotency_key"');
    expect(journal.entries.at(-1)).toEqual(expect.objectContaining({ idx: 119, tag: "0128_saraya_applicant_document_idempotency" }));
  });
});
