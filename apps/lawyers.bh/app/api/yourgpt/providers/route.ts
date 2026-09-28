import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/db/client";
import {
  buildCountryTableSet,
} from "@/lib/db/country-tables";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";
import {
  getPublicLawyers,
  type PublicLawyerSpecialty,
} from "@/lib/publicLawyers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_LAWYER_SPECIALTIES =
  new Set<PublicLawyerSpecialty>([
    "administrative",
    "civil",
    "commercial",
    "labor",
    "criminal",
    "sharia",
    "constitutional",
    "cassation",
    "sports",
  ]);

const OFFICE_ID =
  "gulf-international-collection-consulting";

const OFFICE_NAME_AR =
  "شركة الخليج الدولية للتحصيل والاستشارات ش.ذ.م.م (المكتب المحترف)";

const OFFICE_NAME_EN =
  "Gulf International Collection and Consulting W.L.L. (Professional Office)";

function isPublicLawyerSpecialty(
  value: string,
): value is PublicLawyerSpecialty {
  return PUBLIC_LAWYER_SPECIALTIES.has(
    value as PublicLawyerSpecialty,
  );
}

function cleanText(
  value: unknown,
  max = 120,
): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    value,
  );
}

function isAuthorized(request: Request): boolean {
  const expectedSecret =
    process.env.YOURGPT_BOOKING_SECRET?.trim();

  if (!expectedSecret) {
    console.error(
      "[yourgpt/providers] YOURGPT_BOOKING_SECRET is not configured",
    );

    return false;
  }

  const authorization =
    request.headers.get("authorization")?.trim() ?? "";

  const [scheme, suppliedSecret] =
    authorization.split(/\s+/, 2);

  return (
    scheme?.toLowerCase() === "bearer" &&
    suppliedSecret === expectedSecret
  );
}

type LegalCaseRow = {
  id: string;
  key: string;
  name_ar: string;
  name_en: string;
  category_id: string;
};

type LegalCaseCategoryRow = {
  id: string;
  key: string;
  name_ar: string;
  name_en: string;
};

async function resolveLegalCase(input: {
  countryCode: string;
  legalCasesTable: string;
  legalCaseId: string;
  legalCaseKey: string;
}): Promise<LegalCaseRow | undefined> {
  if (
    input.legalCaseId &&
    !isUuid(input.legalCaseId)
  ) {
    return undefined;
  }

  if (input.legalCaseId) {
    const rows = await sqlClient<LegalCaseRow[]>`
      SELECT
        id,
        key,
        name_ar,
        name_en,
        category_id
      FROM ${sqlClient(input.legalCasesTable)}
      WHERE id = ${input.legalCaseId}::uuid
        AND country_code = ${input.countryCode}
        AND is_active = true
      LIMIT 1
    `;

    return rows[0];
  }

  const rows = await sqlClient<LegalCaseRow[]>`
    SELECT
      id,
      key,
      name_ar,
      name_en,
      category_id
    FROM ${sqlClient(input.legalCasesTable)}
    WHERE key = ${input.legalCaseKey}
      AND country_code = ${input.countryCode}
      AND is_active = true
    LIMIT 1
  `;

  return rows[0];
}

async function resolveCategory(input: {
  countryCode: string;
  categoriesTable: string;
  categoryId: string;
}): Promise<LegalCaseCategoryRow | undefined> {
  const rows =
    await sqlClient<LegalCaseCategoryRow[]>`
      SELECT
        id,
        key,
        name_ar,
        name_en
      FROM ${sqlClient(input.categoriesTable)}
      WHERE id = ${input.categoryId}::uuid
        AND country_code = ${input.countryCode}
        AND is_active = true
      LIMIT 1
    `;

  return rows[0];
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  try {
    const url = new URL(request.url);

    const lang: "ar" | "en" =
      url.searchParams.get("lang") === "en"
        ? "en"
        : "ar";

    const legalCaseId = cleanText(
      url.searchParams.get("legalCaseId"),
      80,
    );

    const legalCaseKey = cleanText(
      url.searchParams.get("legalCaseKey"),
      120,
    );

    if (!legalCaseId && !legalCaseKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            lang === "ar"
              ? "يجب إرسال معرف القضية أو مفتاح القضية."
              : "legalCaseId or legalCaseKey is required.",
        },
        { status: 400 },
      );
    }

    /*
     * الخدمة مخصصة للبحرين حاليًا.
     * لا نطلب countryCode من YourGPT.
     */
    const country = await requireCountryProduct("BH", "lawyers");

    const tables = buildCountryTableSet(country);

    const legalCase = await resolveLegalCase({
      countryCode: country.code,
      legalCasesTable: tables.legal_cases,
      legalCaseId,
      legalCaseKey,
    });

    if (!legalCase) {
      return NextResponse.json(
        {
          ok: false,
          error:
            lang === "ar"
              ? "نوع القضية غير موجود أو غير مفعّل."
              : "The legal case was not found or is inactive.",
        },
        { status: 404 },
      );
    }

    const category = await resolveCategory({
      countryCode: country.code,
      categoriesTable:
        tables.legal_case_categories,
      categoryId: legalCase.category_id,
    });

    if (!category) {
      return NextResponse.json(
        {
          ok: false,
          error:
            lang === "ar"
              ? "تصنيف القضية غير موجود أو غير مفعّل."
              : "The legal case category was not found or is inactive.",
        },
        { status: 404 },
      );
    }

    const publicLawyers =
      await getPublicLawyers(country.code);

    /*
     * نحفظ المفتاح في متغير مستقل حتى يستطيع TypeScript
     * تضييق نوعه إلى PublicLawyerSpecialty.
     */
    const categoryKey = category.key;

    const matchingLawyers =
      isPublicLawyerSpecialty(categoryKey)
        ? publicLawyers
            .filter((lawyer) => {
              if (
                lawyer.subscriptionType !==
                "lawyer"
              ) {
                return false;
              }

              return (
                lawyer.specialtyMain ===
                  categoryKey ||
                lawyer.specialtySubs.includes(
                  categoryKey,
                ) ||
                lawyer.specialties.includes(
                  categoryKey,
                )
              );
            })
            .sort((a, b) => {
              const ratingDifference =
                b.rating - a.rating;

              if (ratingDifference !== 0) {
                return ratingDifference;
              }

              return (
                b.experienceYears -
                a.experienceYears
              );
            })
            .slice(0, 20)
            .map((lawyer) => ({
              id: lawyer.id,

              name:
                lang === "ar"
                  ? lawyer.nameAr
                  : lawyer.nameEn,

              nameAr: lawyer.nameAr,
              nameEn: lawyer.nameEn,

              subtitle:
                lang === "ar"
                  ? lawyer.subtitleAr
                  : lawyer.subtitleEn,

              experienceYears:
                lawyer.experienceYears,

              rating: lawyer.rating,

              reviewCount:
                lawyer.reviewCount,

              workingHours:
                lawyer.workingHours,
            }))
        : [];

    return NextResponse.json({
      ok: true,
      countryCode: country.code,
      lang,

      legalCase: {
        id: legalCase.id,
        key: legalCase.key,

        name:
          lang === "ar"
            ? legalCase.name_ar
            : legalCase.name_en,

        category: {
          id: category.id,
          key: category.key,

          name:
            lang === "ar"
              ? category.name_ar
              : category.name_en,
        },
      },

      assignmentChoices: {
        office: {
          id: OFFICE_ID,
          assignmentMode: "office",

          name:
            lang === "ar"
              ? "المكتب الرئيسي"
              : "Head Office",

          title:
            lang === "ar"
              ? "اختيار المكتب القانوني"
              : "Choose the legal office",

          description:
            lang === "ar"
              ? "يقوم المكتب بمراجعة طلبك وتعيين محامي مناسب حسب نوع القضية والتخصص والتوفر. هذا الخيار أكثر مرونة ولا يضمن اختيار محامي محدد بالاسم."
              : "The office reviews your request and assigns a suitable available lawyer based on the matter and specialization. This option does not guarantee a specific lawyer.",
        },

        lawyer: {
          assignmentMode: "lawyer",

          title:
            lang === "ar"
              ? "اختيار محامي محدد"
              : "Choose a specific lawyer",

          description:
            lang === "ar"
              ? "يمكنك اختيار محامي محدد من القائمة المتاحة، وسيتم توجيه الطلب إليه. يعتمد تأكيد الموعد على توفر محامي الذي اخترته."
              : "You may choose a specific lawyer from the available list. Confirmation depends on that lawyer's availability.",

          lawyers: matchingLawyers,
        },
      },

      lawyersCount:
        matchingLawyers.length,
    });
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error(
      "[yourgpt/providers] GET failed",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load providers",

        details:
          process.env.NODE_ENV !==
            "production" &&
          error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 },
    );
  }
}
