import { readFileSync } from "node:fs";
import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  lawyerTermsAcceptanceRequests,
  lawyerTermsAcceptances,
  termsVersions,
} from "@/lib/db/schema";

const migration = readFileSync(
  "drizzle/0077_terms_and_commission_management.sql",
  "utf8",
);
const verification = readFileSync(
  "drizzle/verify_0075_terms_and_commission_management.sql",
  "utf8",
);
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as {
  entries: Array<{ idx: number; when: number; tag: string }>;
};

describe("0075 terms and commission management migration", () => {
  it("creates the versioned bilingual legal-content contract", () => {
    expect(getTableName(termsVersions)).toBe("terms_versions");
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "terms_versions"');
    expect(migration).toContain("terms_versions_document_type_check");
    expect(migration).toContain("terms_versions_status_check");
    expect(migration).toContain("terms_versions_content_ar_check");
    expect(migration).toContain("terms_versions_content_en_check");
    expect(migration).toContain("terms_versions_document_version_unique_idx");
    expect(migration).toContain("terms_versions_one_published_per_document_idx");
    expect(migration).toContain("WHERE status = 'published'");
  });

  it("enforces lawyer commission percentages and admin audit ownership", () => {
    expect(migration).toContain('numeric(5, 2)');
    expect(migration).toContain("terms_versions_year_one_percentage_check");
    expect(migration).toContain("terms_versions_year_two_percentage_check");
    expect(migration).toContain("terms_versions_commission_scope_check");
    for (const column of [
      "created_by_admin_id",
      "updated_by_admin_id",
      "published_by_admin_id",
      "archived_by_admin_id",
    ]) {
      expect(migration).toContain(`"${column}" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL`);
      expect(verification).toContain(column);
    }
  });

  it("persists unique acceptances and campaign delivery state", () => {
    expect(getTableName(lawyerTermsAcceptances)).toBe("lawyer_terms_acceptances");
    expect(getTableName(lawyerTermsAcceptanceRequests)).toBe(
      "lawyer_terms_acceptance_requests",
    );
    expect(migration).toContain("lawyer_terms_acceptances_lawyer_version_unique_idx");
    expect(migration).toContain("lawyer_terms_acceptance_requests_lawyer_version_unique_idx");
    expect(migration).toContain("lawyer_terms_acceptance_requests_status_check");
    expect(migration).toContain("lawyer_terms_acceptance_requests_notification_status_check");
    expect(migration).toContain("campaign_id");
    expect(migration).toContain("notification_attempt_count");
    expect(migration).toContain("lawyer_terms_acceptance_requests_pending_idx");
  });

  it("seeds both current documents, grants the permission, and journals uniquely", () => {
    expect(migration).toContain("'general'");
    expect(migration).toContain("'lawyer_registration'");
    expect(migration).toContain("20.00");
    expect(migration).toContain("45.00");
    expect(migration).toContain("'{manage_terms_commissions}'");
    expect(verification).toContain("manage_terms_commissions");

    const previous = journal.entries.find(
      (entry) => entry.tag === "0076_repair_mobile_client_notifications",
    );
    const current = journal.entries.find(
      (entry) => entry.tag === "0077_terms_and_commission_management",
    );
    expect(current?.idx).toBe((previous?.idx ?? -1) + 1);
    expect(current?.when).toBeGreaterThan(previous?.when ?? 0);
    expect(journal.entries.filter((entry) => entry.idx === current?.idx)).toHaveLength(1);
  });
});
