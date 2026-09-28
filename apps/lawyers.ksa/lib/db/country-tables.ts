import "server-only";
import { sqlClient } from "./client";

export const COUNTRY_TABLE_SUFFIXES = [
  "consent_log",
  "lawyers",
  "advocate_shifts",
  "lawyer_push_subscriptions",
  "emergency_case_types",
  "consultation_methods",
  "emergency_requests",
  "lawyer_agreements",
  "legal_case_categories",
  "legal_cases",
  "lawyer_legal_cases",
  "booking_requests",
  "booking_reviews",
  "provider_commission_rates",
  "payment_allocations",
  "tap_retailer_onboarding",
] as const;

export type CountryTableSuffix = (typeof COUNTRY_TABLE_SUFFIXES)[number];

export type ActiveCountry = {
  code: string;
  tablePrefix: string;
  nameAr: string;
  nameEn: string;
  currencyCode: string;
  defaultLocale: string;
};

export type CountryPlatform = "lawyers" | "legal_sos";

function normalizeCountryCode(value: string | null | undefined) {
  return (value || "").trim().toUpperCase();
}

export function assertSafeTablePrefix(prefix: string) {
  if (!/^[a-z][a-z0-9_]{1,15}$/.test(prefix)) {
    throw new Error("Unsafe country table prefix");
  }

  return prefix;
}

export function countryTableName(
  prefix: string,
  suffix: CountryTableSuffix,
) {
  return `${assertSafeTablePrefix(prefix)}_${suffix}`;
}

export async function getActiveCountry(
  inputCode: string | null | undefined,
): Promise<ActiveCountry | null> {
  const code = normalizeCountryCode(inputCode);

  if (!/^[A-Z]{2}$/.test(code)) return null;

  const rows = await sqlClient`
    SELECT
      code,
      table_prefix,
      name_ar,
      name_en,
      currency_code,
      default_locale
    FROM public.countries
    WHERE code = ${code}
      AND is_active = true
      AND tables_provisioned = true
    LIMIT 1
  `;

  const row = rows[0] as
    | {
        code: string;
        table_prefix: string;
        name_ar: string;
        name_en: string;
        currency_code: string;
        default_locale: string;
      }
    | undefined;

  if (!row) return null;

  return {
    code: row.code,
    tablePrefix: assertSafeTablePrefix(row.table_prefix),
    nameAr: row.name_ar,
    nameEn: row.name_en,
    currencyCode: row.currency_code,
    defaultLocale: row.default_locale,
  };
}

export function buildCountryTableSet(country: ActiveCountry) {
  return Object.fromEntries(
    COUNTRY_TABLE_SUFFIXES.map((suffix) => [
      suffix,
      countryTableName(country.tablePrefix, suffix),
    ]),
  ) as Record<CountryTableSuffix, string>;
}
