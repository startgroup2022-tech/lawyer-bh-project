import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("drizzle/0074_consultation_types_admin.sql", "utf8");
const verification = readFileSync("drizzle/verify_0074_consultation_types_admin.sql", "utf8");
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as {
  entries: Array<{ idx: number; tag: string }>;
};

describe("0074 consultation types administration migration", () => {
  it("adds catalogue audit columns and grants the new permission", () => {
    for (const column of ["created_by_admin_id", "updated_by_admin_id", "archived_at", "archived_by_admin_id"]) {
      expect(migration).toContain(`ADD COLUMN IF NOT EXISTS ${column}`);
      expect(verification).toContain(column);
    }
    expect(migration).toContain("'{manage_consultation_types}'");
    expect(migration).toContain("role IN ('admin', 'super_admin')");
    expect(migration).toContain("is_active = true");
  });

  it("uses a unique journal index after About management", () => {
    const about = journal.entries.find((entry) => entry.tag === "0073_about_page_management");
    const consultation = journal.entries.find((entry) => entry.tag === "0074_consultation_types_admin");
    expect(consultation?.idx).toBe((about?.idx ?? -1) + 1);
    expect(journal.entries.filter((entry) => entry.idx === consultation?.idx)).toHaveLength(1);
  });
});
