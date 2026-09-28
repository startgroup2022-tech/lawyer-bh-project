import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("../../drizzle/0073_about_page_management.sql", import.meta.url), "utf8");

describe("About management migration", () => {
  it("creates ordered archival sections and members with cascade deletion", () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "about_sections"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "about_members"');
    expect(sql).toContain('ON DELETE CASCADE');
    expect(sql).toContain('about_sections_position_check');
    expect(sql).toContain('about_members_position_check');
    expect(sql).toContain('previous_experience_ar');
    expect(sql).toContain('photo_storage_key');
  });
});
