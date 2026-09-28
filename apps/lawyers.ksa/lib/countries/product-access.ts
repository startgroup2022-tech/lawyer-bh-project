import "server-only";

import { sqlClient } from "@/lib/db/client";
import {
  assertSafeTablePrefix,
  type ActiveCountry,
  type CountryPlatform,
} from "@/lib/db/country-tables";

export type CountryProductAccessErrorCode =
  | "COUNTRY_NOT_ACTIVE"
  | "COUNTRY_PRODUCT_DISABLED"
  | "COUNTRY_PRODUCT_INVALID";

export class CountryProductAccessError extends Error {
  constructor(
    readonly code: CountryProductAccessErrorCode,
    readonly countryCode: string,
    readonly product: string,
  ) {
    super(code);
    this.name = "CountryProductAccessError";
  }
}

export async function requireCountryProduct(
  code: string | null | undefined,
  product: CountryPlatform,
): Promise<ActiveCountry> {
  const normalizedCode = (code || "").trim().toUpperCase();
  if (product !== "lawyers" && product !== "legal_sos") {
    throw new CountryProductAccessError(
      "COUNTRY_PRODUCT_INVALID",
      normalizedCode,
      String(product),
    );
  }
  if (!/^[A-Z]{2}$/.test(normalizedCode)) {
    throw new CountryProductAccessError(
      "COUNTRY_NOT_ACTIVE",
      normalizedCode,
      product,
    );
  }

  const rows = await sqlClient`
    SELECT
      c.code,
      c.table_prefix,
      c.name_ar,
      c.name_en,
      c.currency_code,
      c.default_locale,
      c.is_active,
      c.tables_provisioned,
      COALESCE(settings.lawyers_platform_enabled, false) AS lawyers_platform_enabled,
      COALESCE(settings.legal_sos_enabled, false) AS legal_sos_enabled
    FROM public.countries c
    LEFT JOIN public.country_channel_settings settings ON settings.code = c.code
    WHERE c.code = ${normalizedCode}
    LIMIT 1
  `;
  const row = rows[0] as {
    code: string;
    table_prefix: string;
    name_ar: string;
    name_en: string;
    currency_code: string;
    default_locale: string;
    is_active: boolean;
    tables_provisioned: boolean;
    lawyers_platform_enabled: boolean;
    legal_sos_enabled: boolean;
  } | undefined;

  if (!row?.is_active || !row.tables_provisioned) {
    throw new CountryProductAccessError(
      "COUNTRY_NOT_ACTIVE",
      normalizedCode,
      product,
    );
  }

  const productEnabled = product === "lawyers"
    ? row.lawyers_platform_enabled
    : row.legal_sos_enabled;
  if (!productEnabled) {
    throw new CountryProductAccessError(
      "COUNTRY_PRODUCT_DISABLED",
      row.code,
      product,
    );
  }

  return {
    code: row.code,
    tablePrefix: assertSafeTablePrefix(row.table_prefix),
    nameAr: row.name_ar,
    nameEn: row.name_en,
    currencyCode: row.currency_code,
    defaultLocale: row.default_locale,
  };
}

export function mapCountryProductAccessError(error: unknown): {
  status: 400 | 403;
  body: { error: CountryProductAccessErrorCode };
} | null {
  if (!(error instanceof CountryProductAccessError)) return null;

  return {
    status: error.code === "COUNTRY_PRODUCT_DISABLED" ? 403 : 400,
    body: { error: error.code },
  };
}
