import "server-only";

import { sqlClient } from "@/lib/db/client";
import {
  buildCountryTableSet,
  type ActiveCountry,
} from "@/lib/db/country-tables";
import {
  mapEmergencyCaseRow,
  type EmergencyCaseCatalogItem,
  type EmergencyCaseRow,
} from "@/lib/sos/emergencyCaseProjection";

export type { EmergencyCaseCatalogItem } from "@/lib/sos/emergencyCaseProjection";

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
      icon_asset_url,
      workflow_type,
      sort_order
    FROM ONLY ${sqlClient(tables.emergency_case_types)}
    WHERE country_code = ${country.code}
      AND is_active = true
    ORDER BY sort_order ASC, name_en ASC
  `;

  return rows
    .map(mapEmergencyCaseRow)
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
      icon_asset_url,
      workflow_type,
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

  return mapEmergencyCaseRow(row);
}
