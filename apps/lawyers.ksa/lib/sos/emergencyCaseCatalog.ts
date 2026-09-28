import "server-only";

import { sqlClient } from "@/lib/db/client";
import {
  buildCountryTableSet,
  type ActiveCountry,
} from "@/lib/db/country-tables";
import type { SosCaseSlug } from "@/lib/sos/caseTypes";

export type EmergencyCaseCatalogItem = {
  id: string;
  slug: SosCaseSlug;
  label: {
    ar: string;
    en: string;
  };
  helper: {
    ar: string;
    en: string;
  };
  actionType: {
    ar: string;
    en: string;
  };
  baseFee: number;
  currencyCode: string;
  iconKey: string;
  sortOrder: number;
};

type EmergencyCaseRow = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  action_type_ar: string | null;
  action_type_en: string | null;
  price: string | number;
  currency_code: string;
  icon_key: string | null;
  sort_order: string | number;
};

const VALID_SLUGS = new Set<SosCaseSlug>([
  "emergency_arrest",
  "emergency_search",
  "emergency_travel_ban",
  "emergency_evidence",
  "emergency_report",
  "emergency_consultation",
]);

function isSosCaseSlug(value: string): value is SosCaseSlug {
  return VALID_SLUGS.has(value as SosCaseSlug);
}

function mapRow(
  row: EmergencyCaseRow,
): EmergencyCaseCatalogItem | null {
  if (!isSosCaseSlug(row.slug)) {
    return null;
  }

  const price = Number(row.price);

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  const sortOrder = Number(row.sort_order);

  return {
    id: row.id,
    slug: row.slug,

    label: {
      ar: row.name_ar,
      en: row.name_en,
    },

    helper: {
      ar: row.description_ar ?? "",
      en: row.description_en ?? "",
    },

    actionType: {
      ar: row.action_type_ar ?? "",
      en: row.action_type_en ?? "",
    },

    baseFee: price,
    currencyCode: row.currency_code,
    iconKey: row.icon_key ?? "shield-alert",
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

export async function listEmergencyCaseTypes(
  country: ActiveCountry,
): Promise<EmergencyCaseCatalogItem[]> {
  const tables = buildCountryTableSet(country);

  const rows = await sqlClient<EmergencyCaseRow[]>`
    SELECT
      id,
      slug,
      name_ar,
      name_en,
      description_ar,
      description_en,
      action_type_ar,
      action_type_en,
      price,
      currency_code,
      icon_key,
      sort_order
    FROM ONLY ${sqlClient(tables.emergency_case_types)}
    WHERE country_code = ${country.code}
      AND is_active = true
    ORDER BY sort_order ASC, name_en ASC
  `;

  return rows
    .map(mapRow)
    .filter(
      (
        item,
      ): item is EmergencyCaseCatalogItem => item !== null,
    );
}

export async function findEmergencyCaseType(
  country: ActiveCountry,
  slug: string,
): Promise<EmergencyCaseCatalogItem | null> {
  if (!isSosCaseSlug(slug)) {
    return null;
  }

  const tables = buildCountryTableSet(country);

  const rows = await sqlClient<EmergencyCaseRow[]>`
    SELECT
      id,
      slug,
      name_ar,
      name_en,
      description_ar,
      description_en,
      action_type_ar,
      action_type_en,
      price,
      currency_code,
      icon_key,
      sort_order
    FROM ONLY ${sqlClient(tables.emergency_case_types)}
    WHERE country_code = ${country.code}
      AND slug = ${slug}
      AND is_active = true
    LIMIT 1
  `;

  const row = rows[0];

  if (!row) {
    return null;
  }

  return mapRow(row);
}