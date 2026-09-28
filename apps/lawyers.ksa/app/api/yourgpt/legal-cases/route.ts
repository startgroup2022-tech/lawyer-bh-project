import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/db/client";
import { getKsaContext } from "@/lib/ksa/context";
import { listConsultationMethods } from "@/lib/booking/consultationMethodCatalog";
import { SERVICE_STAGE_CATALOG } from "@/lib/booking/serviceStageCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAUDI_TIME_ZONE = "Asia/Riyadh";

const APPOINTMENT_TIME_PERIODS = [
  {
    key: "first",
    value: "09:00-13:00",
    name: {
      ar: "الفترة الأولى",
      en: "First period",
    },
    timeLabel: {
      ar: "9 صباحاً - 1 ظهراً",
      en: "9:00 AM - 1:00 PM",
    },
  },
  {
    key: "second",
    value: "13:00-17:00",
    name: {
      ar: "الفترة الثانية",
      en: "Second period",
    },
    timeLabel: {
      ar: "1 ظهراً - 5 عصراً",
      en: "1:00 PM - 5:00 PM",
    },
  },
  {
    key: "third",
    value: "09:00-17:00",
    name: {
      ar: "الفترة الثالثة",
      en: "Third period",
    },
    timeLabel: {
      ar: "9 صباحاً - 5 عصراً",
      en: "9:00 AM - 5:00 PM",
    },
  },
] as const;

function getDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SAUDI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function listAppointmentDates(lang: "ar" | "en") {
  const todayKey = getDateKey(new Date());
  const todayAtNoon = new Date(`${todayKey}T12:00:00+03:00`);
  const locale = lang === "ar" ? "ar-SA-u-nu-arab" : "en-SA";
  const weekdayFormatter = new Intl.DateTimeFormat(locale, {
      timeZone: SAUDI_TIME_ZONE,
    weekday: "long",
  });
  const dateLabelFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: SAUDI_TIME_ZONE,
    day: "numeric",
    month: "long",
  });
  const weekdayKeyFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: SAUDI_TIME_ZONE,
    weekday: "short",
  });

  const dates: Array<{
    value: string;
    dayName: string;
    dateLabel: string;
    label: string;
  }> = [];

  for (let offset = 1; dates.length < 3 && offset <= 14; offset += 1) {
    const candidate = new Date(
      todayAtNoon.getTime() + offset * 24 * 60 * 60 * 1000,
    );
    const weekdayKey = weekdayKeyFormatter.format(candidate);

    if (weekdayKey === "Fri" || weekdayKey === "Sat") {
      continue;
    }

    const dayName = weekdayFormatter.format(candidate);
    const dateLabel = dateLabelFormatter.format(candidate);

    dates.push({
      value: getDateKey(candidate),
      dayName,
      dateLabel,
      label: `${dayName} ${dateLabel}`,
    });
  }

  return dates;
}

function isAuthorized(request: Request): boolean {
  const expectedSecret =
    process.env.YOURGPT_BOOKING_SECRET?.trim();

  if (!expectedSecret) {
    console.error(
      "[yourgpt/legal-cases] YOURGPT_BOOKING_SECRET is not configured",
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
  description_ar: string | null;
  description_en: string | null;
  keywords_ar: unknown;
  keywords_en: unknown;
  guidance_ar: string | null;
  guidance_en: string | null;
  guidance_documents_ar: unknown;
  guidance_documents_en: unknown;
  clarifying_question_ar: string | null;
  clarifying_question_en: string | null;
  category_id: string;
  category_key: string;
  category_name_ar: string;
  category_name_en: string;
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
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

    const { country, tables } = await getKsaContext();

    console.log("[yourgpt/legal-cases] tables", {
      countryCode: country.code,
      legalCases: tables.legal_cases,
      categories: tables.legal_case_categories,
    });

    const rows = await sqlClient<LegalCaseRow[]>`
      SELECT
        lc.id,
        lc.key,
        lc.name_ar,
        lc.name_en,
        lc.description_ar,
        lc.description_en,
        lc.keywords_ar,
        lc.keywords_en,
        guidance.guidance_ar,
        guidance.guidance_en,
        guidance.documents_ar AS guidance_documents_ar,
        guidance.documents_en AS guidance_documents_en,
        guidance.clarifying_question_ar,
        guidance.clarifying_question_en,
        category.id AS category_id,
        category.key AS category_key,
        category.name_ar AS category_name_ar,
        category.name_en AS category_name_en
      FROM ${sqlClient(tables.legal_cases)} AS lc
      INNER JOIN ${sqlClient(
        tables.legal_case_categories,
      )} AS category
        ON category.id = lc.category_id
        AND category.country_code = lc.country_code
      LEFT JOIN public.legal_case_guidance AS guidance
        ON guidance.legal_case_key = lc.key
        AND guidance.is_active = true
      WHERE lc.country_code = ${country.code}
        AND lc.is_active = true
        AND category.is_active = true
      ORDER BY
        category.sort_order ASC,
        lc.sort_order ASC
    `;

    const cases = rows.map((item) => {
      return {
        id: item.id,
        key: item.key,

        name:
          lang === "ar"
            ? item.name_ar
            : item.name_en,

        description:
          lang === "ar"
            ? item.description_ar
            : item.description_en,

        keywords: toStringArray(
          lang === "ar"
            ? item.keywords_ar
            : item.keywords_en,
        ),

        guidance:
          (lang === "ar"
            ? item.guidance_ar
            : item.guidance_en)
            ? {
                text:
                  lang === "ar"
                    ? item.guidance_ar
                    : item.guidance_en,
                documents: toStringArray(
                  lang === "ar"
                    ? item.guidance_documents_ar
                    : item.guidance_documents_en,
                ),
                clarifyingQuestion:
                  lang === "ar"
                    ? item.clarifying_question_ar
                    : item.clarifying_question_en,
              }
            : null,

        category: {
          id: item.category_id,
          key: item.category_key,

          name:
            lang === "ar"
              ? item.category_name_ar
              : item.category_name_en,
        },
      };
    });

    const consultationMethods = await listConsultationMethods(country);

    const services = SERVICE_STAGE_CATALOG.map((service) => ({
      key: service.key,
      name: service.name[lang],
      description: service.description[lang],
      requiresConsultationMethod: service.requiresConsultationMethod,
      fixedAmountBhd: service.fixedAmountBhd,
      currencyCode: country.currencyCode,
      officeOnly: service.officeOnly,
      providerTypes: service.providerTypes,
    }));

    const appointmentDates = listAppointmentDates(lang);
    const appointmentTimePeriods = APPOINTMENT_TIME_PERIODS.map((period) => ({
      key: period.key,
      value: period.value,
      name: period.name[lang],
      timeLabel: period.timeLabel[lang],
      label: `${period.name[lang]} — ${period.timeLabel[lang]}`,
    }));

    return NextResponse.json({
      ok: true,
      countryCode: country.code,
      lang,
      currencyCode: country.currencyCode,
      appointmentDates,
      appointmentTimePeriods,
      services,
      consultationMethods: consultationMethods.map((method) => ({
        id: method.id,
        key: method.code,
        name: method.name[lang],
        price: method.price,
        currencyCode: method.currencyCode,
        durationMinutes: method.durationMinutes,
      })),
      cases,
    });
  } catch (error) {
    console.error(
      "[yourgpt/legal-cases] GET failed",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          "Failed to load legal cases",

        details:
          process.env.NODE_ENV !== "production" &&
          error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 },
    );
  }
}
