// apps/lawyers.bh/lib/legalCases.ts

import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getTapMode } from "@/lib/tap/config";
import { tapProviderReadinessCondition } from "@/lib/tap/provider-readiness";

export type LegalCaseCategoryKey =
  | "criminal"
  | "civil"
  | "sharia"
  | "commercial"
  | "labor"
  | "administrative"
  | "constitutional"
  | "cassation";

export async function getLegalCases(
  locale: string,
  countryCode = "SA",
) {
  const normalizedCountryCode = countryCode.trim().toUpperCase();
  const isAr = locale === "ar";

  const rows = await db
    .select({
      categoryId: schema.legalCaseCategories.id,
      categoryKey: schema.legalCaseCategories.key,
      categoryNameAr: schema.legalCaseCategories.nameAr,
      categoryNameEn: schema.legalCaseCategories.nameEn,
      categorySortOrder: schema.legalCaseCategories.sortOrder,

      caseId: schema.legalCases.id,
      caseKey: schema.legalCases.key,
      caseNameAr: schema.legalCases.nameAr,
      caseNameEn: schema.legalCases.nameEn,
      caseDescriptionAr: schema.legalCases.descriptionAr,
      caseDescriptionEn: schema.legalCases.descriptionEn,
      caseSortOrder: schema.legalCases.sortOrder,
    })
    .from(schema.legalCases)
    .innerJoin(
      schema.legalCaseCategories,
      and(
        eq(schema.legalCases.categoryId, schema.legalCaseCategories.id),
        eq(
          schema.legalCases.countryCode,
          schema.legalCaseCategories.countryCode,
        ),
      ),
    )
    .where(
      and(
        eq(schema.legalCases.countryCode, normalizedCountryCode),
        eq(schema.legalCaseCategories.countryCode, normalizedCountryCode),
        eq(schema.legalCases.isActive, true),
        eq(schema.legalCaseCategories.isActive, true),
      ),
    )
    .orderBy(
      asc(schema.legalCaseCategories.sortOrder),
      asc(schema.legalCases.sortOrder),
    );

  const groups = new Map<
    string,
    {
      id: string;
      key: string;
      name: string;
      cases: Array<{
        id: string;
        key: string;
        name: string;
        description: string | null;
      }>;
    }
  >();

  for (const row of rows) {
    const group =
      groups.get(row.categoryKey) ??
      {
        id: row.categoryId,
        key: row.categoryKey,
        name: isAr ? row.categoryNameAr : row.categoryNameEn,
        cases: [],
      };

    group.cases.push({
      id: row.caseId,
      key: row.caseKey,
      name: isAr ? row.caseNameAr : row.caseNameEn,
      description: isAr ? row.caseDescriptionAr : row.caseDescriptionEn,
    });

    groups.set(row.categoryKey, group);
  }

  return Array.from(groups.values());
}

export async function getLawyersForLegalCase(
  legalCaseId: string,
  countryCode = "SA",
) {
  const normalizedCountryCode = countryCode.trim().toUpperCase();
  return db
    .select({
      lawyerId: schema.saudiLawyers.id,
      fullNameAr: schema.saudiLawyers.fullNameAr,
      fullNameEn: schema.saudiLawyers.fullNameEn,
      email: schema.saudiLawyers.email,
      phone: schema.saudiLawyers.phone,
      registrationLevel: schema.saudiLawyers.registrationLevel,
      experienceYears: schema.saudiLawyers.experienceYears,
      isPrimary: schema.lawyerLegalCases.isPrimary,
    })
    .from(schema.lawyerLegalCases)
    .innerJoin(
      schema.saudiLawyers,
      and(
        eq(schema.lawyerLegalCases.lawyerId, schema.saudiLawyers.id),
        eq(
          schema.lawyerLegalCases.countryCode,
          schema.saudiLawyers.countryCode,
        ),
      ),
    )
    .innerJoin(
      schema.tapRetailerOnboarding,
      eq(
        schema.tapRetailerOnboarding.lawyerId,
        schema.saudiLawyers.id,
      ),
    )
    .where(
      and(
        eq(schema.lawyerLegalCases.countryCode, normalizedCountryCode),
        eq(schema.saudiLawyers.countryCode, normalizedCountryCode),
        eq(schema.lawyerLegalCases.legalCaseId, legalCaseId),
        tapProviderReadinessCondition(getTapMode()),
      ),
    )
    .orderBy(
      asc(schema.lawyerLegalCases.sortOrder),
      asc(schema.saudiLawyers.fullNameEn),
    );
}
