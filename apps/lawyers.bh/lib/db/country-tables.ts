import "server-only";
import { getRegistrationCountryDefinition } from "@/lib/countries/registration-country";
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
  return (value || "BH").trim().toUpperCase();
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

/** Returns a provisioned country only when the requested product is enabled. */
export async function getPlatformReadyCountry(
  inputCode: string | null | undefined,
  platform: CountryPlatform,
): Promise<ActiveCountry | null> {
  const code = normalizeCountryCode(inputCode);
  if (!/^[A-Z]{2}$/.test(code)) return null;
  if (platform !== "lawyers" && platform !== "legal_sos") return null;
  const rows = await sqlClient`
    SELECT c.code, c.table_prefix, c.name_ar, c.name_en, c.currency_code, c.default_locale
    FROM public.countries c
    JOIN public.country_channel_settings settings ON settings.code = c.code
    WHERE c.code = ${code}
      AND c.is_active = true
      AND c.tables_provisioned = true
      AND CASE WHEN ${platform} = 'lawyers'
        THEN settings.lawyers_platform_enabled
        ELSE settings.legal_sos_enabled
      END = true
    LIMIT 1
  `;
  const row = rows[0] as {code:string;table_prefix:string;name_ar:string;name_en:string;currency_code:string;default_locale:string} | undefined;
  return row ? {code:row.code, tablePrefix:assertSafeTablePrefix(row.table_prefix), nameAr:row.name_ar, nameEn:row.name_en, currencyCode:row.currency_code, defaultLocale:row.default_locale} : null;
}

export async function ensureCountryProvisionedForRegistration(
  inputCode: string,
): Promise<ActiveCountry | null> {
  const definition = getRegistrationCountryDefinition(inputCode);
  if (!definition) return null;

  const rows = await sqlClient.begin(async (transaction) => transaction`
    SELECT
      code,
      table_prefix,
      name_ar,
      name_en,
      currency_code,
      default_locale
    FROM public.ensure_registration_country_tables(
      ${definition.code},
      ${definition.tablePrefix},
      ${definition.nameAr},
      ${definition.nameEn},
      ${definition.phoneCode ?? ""},
      ${definition.currencyCode},
      ${definition.defaultLocale}
    )
  `);

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

  if (!row) throw new Error("Country provisioning failed");

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
