import { readFileSync } from "node:fs";
import postgres from "postgres";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { termsVersions } from "../db/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { archiveTermsVersion, createTermsDraft, getPublishedTerms, publishTermsVersion, updateTermsDraft } from "./service";
import { listLawyerCommissionRows, setLawyerCommissionOverride, getAcceptedCommissionPercentages } from "./commissions";
import { acceptRequiredLawyerTerms, getLawyerTermsRequirement, requestExistingLawyerAcceptance } from "./acceptance";

const url = process.env.TERMS_TEST_DATABASE_URL;
const actor = { adminId: "00000000-0000-4000-8000-000000000001" };
const lawyerId = "00000000-0000-4000-8000-000000000002";
let sql: ReturnType<typeof postgres>;

describe.skipIf(!url)("terms management against an isolated PostgreSQL database", () => {
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (parsed.hostname !== "127.0.0.1" || parsed.port !== "55437" || parsed.pathname !== "/terms_management_test") throw new Error("Use the isolated local test database");
    process.env.DATABASE_URL = url;
    sql = postgres(url!, { max: 1, onnotice: () => {} });
    await sql.unsafe("DROP TABLE IF EXISTS lawyer_terms_acceptance_requests, lawyer_terms_acceptances, terms_versions, bahrain_provider_commission_rates, bahrain_lawyers, admin_users");
    await sql.unsafe(`
      CREATE TABLE admin_users (id uuid PRIMARY KEY, role text, is_active boolean, permissions jsonb, permissions_updated_at timestamptz);
      CREATE TABLE bahrain_lawyers (id uuid PRIMARY KEY, country_code text, full_name_ar text, full_name_en text, email text, reviewed_at timestamptz, created_at timestamptz DEFAULT now(), status text, is_active boolean);
      CREATE TABLE bahrain_provider_commission_rates (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider_id uuid REFERENCES bahrain_lawyers(id), country_code text, platform_percentage numeric(5,2), provider_percentage numeric(5,2), effective_from timestamptz, effective_to timestamptz, is_active boolean, notes text, updated_at timestamptz DEFAULT now());
    `);
    await sql`INSERT INTO admin_users VALUES (${actor.adminId}, 'super_admin', true, '{}', now())`;
    await sql`INSERT INTO bahrain_lawyers(id,country_code,full_name_ar,full_name_en,email,reviewed_at,status,is_active) VALUES (${lawyerId},'BH','محامي اختبار','Test lawyer','test@example.invalid',now()-interval '3 months','approved',true)`;
    const migration = readFileSync("drizzle/0077_terms_and_commission_management.sql", "utf8");
    await sql.unsafe(migration);
    await sql.unsafe(migration);
    await sql.unsafe(readFileSync("drizzle/verify_0075_terms_and_commission_management.sql", "utf8"));
    await sql.unsafe(readFileSync("drizzle/0080_legalsos_legal_documents.sql", "utf8"));
    await sql.unsafe(readFileSync("drizzle/0081_legalsos_lawyer_agreement.sql", "utf8"));
    const originalRows = await sql`SELECT * FROM terms_versions ORDER BY id`;
    const policyMigration = readFileSync("drizzle/0082_public_policies.sql", "utf8");
    await sql.unsafe(policyMigration);
    await sql.unsafe(policyMigration);
    expect(await sql`SELECT * FROM terms_versions ORDER BY id`).toEqual(originalRows);
  });
  afterAll(async () => { await sql?.end(); await globalThis.__lawyersBhPg?.end(); });

  it("keeps ORM-generated policy constraints compatible with the migration", async () => {
    const checks = getTableConfig(termsVersions).checks.filter(c => ['terms_versions_document_type_check', 'terms_versions_commission_scope_check'].includes(c.name));
    for (const type of ['privacy', 'refund', 'legalsos_terms', 'legalsos_privacy', 'legalsos_lawyer_agreement']) {
      for (const check of checks) {
        const expression = new PgDialect().sqlToQuery(check.value).sql;
        const [result] = await sql.unsafe(`SELECT (${expression}) AS valid FROM (SELECT $1::text AS document_type, NULL::numeric AS platform_percentage_year_one, NULL::numeric AS platform_percentage_year_two) terms_versions`, [type]);
        expect(result.valid).toBe(true);
      }
    }
  });

  it("loads seeded terms, saves and publishes a draft, and keeps the public version available", async () => {
    const first = await getPublishedTerms("general");
    expect(first?.contentAr).toContain("الشروط");
    const input = { documentType: "general" as const, contentAr: "نص تجريبي", contentEn: "Test terms", platformPercentageYearOne: null, platformPercentageYearTwo: null, lawyerPercentageYearOne: null, lawyerPercentageYearTwo: null };
    const draft = await createTermsDraft(input, actor);
    const updated = await updateTermsDraft(draft.id, { ...input, contentEn: "Updated test terms" }, actor);
    expect(updated.contentEn).toBe("Updated test terms");
    await publishTermsVersion(draft.id, actor);
    expect((await getPublishedTerms("general"))?.id).toBe(draft.id);
    await expect(archiveTermsVersion(draft.id, actor)).rejects.toThrow("published_version_required");
  });

  it.each(["privacy", "refund"] as const)("isolates %s publications and republishes archives without modifying other agreements", async (documentType) => {
    const originals = await sql`SELECT * FROM terms_versions WHERE document_type NOT IN ('privacy','refund') ORDER BY id`;
    const input = { documentType, contentAr: "سياسة اختبار", contentEn: "Test policy", platformPercentageYearOne: null, platformPercentageYearTwo: null, lawyerPercentageYearOne: null, lawyerPercentageYearTwo: null };
    const first = await createTermsDraft(input, actor);
    expect(await getPublishedTerms(documentType)).toBeNull();
    await publishTermsVersion(first.id, actor);
    const second = await createTermsDraft(input, actor);
    await publishTermsVersion(second.id, actor);
    await publishTermsVersion(first.id, actor);
    expect((await getPublishedTerms(documentType))?.id).toBe(first.id);
    expect(await sql`SELECT status FROM terms_versions WHERE id=${second.id}`).toEqual([{ status: 'archived' }]);
    expect(await sql`SELECT * FROM terms_versions WHERE document_type NOT IN ('privacy','refund') ORDER BY id`).toEqual(originals);
  });

  it("serializes simultaneous drafts and publications without losing the current policy", async () => {
    const input = { documentType: "privacy" as const, contentAr: "متزامن", contentEn: "Concurrent", platformPercentageYearOne: null, platformPercentageYearTwo: null, lawyerPercentageYearOne: null, lawyerPercentageYearTwo: null };
    const drafts = await Promise.all(Array.from({ length: 6 }, () => createTermsDraft(input, actor)));
    expect(new Set(drafts.map(d => d.version)).size).toBe(6);
    await Promise.all(drafts.map(d => publishTermsVersion(d.id, actor)));
    const rows = await sql`SELECT id FROM terms_versions WHERE document_type='privacy' AND status='published'`;
    expect(rows).toHaveLength(1);
    expect(drafts.map(d => d.id)).toContain(rows[0].id);
  });

  it("lists actual lawyer shares and replaces both current and future schedules without overlapping rates", async () => {
    await sql`INSERT INTO bahrain_provider_commission_rates(provider_id,country_code,platform_percentage,provider_percentage,effective_from,effective_to,is_active) VALUES
      (${lawyerId},'BH',20,80,now()-interval '3 months',now()+interval '9 months',true),
      (${lawyerId},'BH',45,55,now()+interval '9 months',null,true)`;
    expect(await listLawyerCommissionRows({ query: "Test lawyer" })).toEqual([expect.objectContaining({ platformPercentage: "20.00", providerPercentage: "80.00" })]);
    await setLawyerCommissionOverride({ lawyerId, countryCode: "BH", platformPercentage: "25", effectiveFrom: new Date().toISOString(), reason: "Test override" }, actor);
    const active = await sql`SELECT platform_percentage FROM bahrain_provider_commission_rates WHERE provider_id=${lawyerId} AND is_active=true AND (effective_to IS NULL OR effective_to>now())`;
    expect(active).toEqual([{ platform_percentage: "25.00" }]);
  });

  it("requires requested acceptance and restores access only after acceptance", async () => {
    const terms = await getPublishedTerms("lawyer_registration");
    expect(await getLawyerTermsRequirement(lawyerId)).toBeNull();
    await requestExistingLawyerAcceptance(terms!.id, actor);
    expect((await getLawyerTermsRequirement(lawyerId))?.versionId).toBe(terms!.id);
    await acceptRequiredLawyerTerms(lawyerId, terms!.id, {});
    expect(await getLawyerTermsRequirement(lawyerId)).toBeNull();
  });

  it("uses the lawyer's accepted percentages even after newer terms are published", async () => {
    const input = { documentType: "lawyer_registration" as const, contentAr: "شروط جديدة", contentEn: "New terms", platformPercentageYearOne: "30.00", platformPercentageYearTwo: "40.00", lawyerPercentageYearOne: "70.00", lawyerPercentageYearTwo: "60.00" };
    const draft = await createTermsDraft(input, actor);
    await publishTermsVersion(draft.id, actor);
    expect(await getAcceptedCommissionPercentages(lawyerId)).toEqual({ platformPercentageYearOne: 20, platformPercentageYearTwo: 45 });
  });

  it.each(["general", "lawyer_registration"] as const)("republishes archived %s terms and preserves drafts and lawyer acceptances", async (documentType) => {
    const [original] = await sql`SELECT * FROM terms_versions WHERE document_type=${documentType} AND status='archived' ORDER BY version LIMIT 1`;
    const current = await getPublishedTerms(documentType);
    const acceptances = await sql`SELECT * FROM lawyer_terms_acceptances ORDER BY id`;
    const requests = await sql`SELECT * FROM lawyer_terms_acceptance_requests ORDER BY id`;
    const otherType = documentType === "general" ? "lawyer_registration" : "general";
    const other = await getPublishedTerms(otherType);
    const draft = await createTermsDraft({ documentType, contentAr: "مسودة محفوظة", contentEn: "Keep draft", platformPercentageYearOne: original.platform_percentage_year_one, platformPercentageYearTwo: original.platform_percentage_year_two, lawyerPercentageYearOne: null, lawyerPercentageYearTwo: null }, actor);
    const republished = await publishTermsVersion(original.id, actor);
    expect(republished).toMatchObject({ id: original.id, version: original.version, status: "published", archivedAt: null, contentAr: original.content_ar, contentEn: original.content_en });
    expect((await getPublishedTerms(documentType))?.id).toBe(original.id);
    expect(await sql`SELECT status FROM terms_versions WHERE id=${current!.id}`).toEqual([{ status: "archived" }]);
    expect(await sql`SELECT status FROM terms_versions WHERE id=${draft.id}`).toEqual([{ status: "draft" }]);
    expect(await sql`SELECT archived_by_admin_id FROM terms_versions WHERE id=${original.id}`).toEqual([{ archived_by_admin_id: null }]);
    expect(await getPublishedTerms(otherType)).toEqual(other);
    expect(await sql`SELECT * FROM lawyer_terms_acceptances ORDER BY id`).toEqual(acceptances);
    expect(await sql`SELECT * FROM lawyer_terms_acceptance_requests ORDER BY id`).toEqual(requests);
  });
});
