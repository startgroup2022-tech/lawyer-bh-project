import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("drizzle/0065_faq_content_management.sql", "utf8");
const verify = readFileSync("drizzle/verify_0065_faq_content_management.sql", "utf8");
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: Array<{ idx: number; tag: string }> };

describe("0065 FAQ content migration contract", () => {
  it("creates normalized category and question tables", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.faq_categories");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.faq_questions");
    expect(migration).toContain("ON DELETE RESTRICT");
    expect(migration.match(/updated_at timestamptz\(3\)/g)).toHaveLength(2);
  });

  it("seeds the current five categories and ten questions idempotently", () => {
    for (const key of ["general", "services", "providers", "payments", "privacy"]) expect(migration).toContain(`('${key}'`);
    expect(migration).toContain("ON CONFLICT (key) DO NOTHING");
    expect(migration).toContain("WHERE NOT EXISTS");
    expect(verify).toContain("<> 5");
    expect(verify).toContain("<> 10");
  });

  it("appends 0065 after 0064", () => {
    const lease = journal.entries.find((entry) => entry.tag === "0064_saraya_leases");
    const faq = journal.entries.find((entry) => entry.tag === "0065_faq_content_management");
    expect(faq!.idx).toBe(lease!.idx + 1);
  });

  it("grants manage_faq only to active broadly privileged admins", () => {
    expect(migration).toContain("jsonb_set(permissions, '{manage_faq}', 'true'::jsonb, true)");
    expect(migration).toContain("permissions @> '");
    expect(migration).toContain("\"manage_notifications\":true");
    expect(migration).toContain("role = 'admin'");
    expect(migration).toContain("is_active = true");
  });
});
