import "server-only";

import { sqlClient } from "@/lib/db/client";
import {
  buildCountryTableSet,
  getActiveCountry,
} from "@/lib/db/country-tables";
import type { AdminSosCaseInput } from "./admin-case-types";
import { SosCaseAdminError } from "./admin-case-types";

type AdminCaseRow = AdminSosCaseInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

async function tableFor(countryCode: string) {
  const country = await getActiveCountry(countryCode);
  if (!country) throw new SosCaseAdminError("invalid_country");
  return { country, table: buildCountryTableSet(country).emergency_case_types };
}

export async function listAdminSosCases(countryCode: string) {
  const { country, table } = await tableFor(countryCode);
  const rows = await sqlClient<AdminCaseRow[]>`
    SELECT
      id,
      country_code AS "countryCode",
      slug,
      name_ar AS "nameAr",
      name_en AS "nameEn",
      description_ar AS "descriptionAr",
      description_en AS "descriptionEn",
      action_type_ar AS "actionTypeAr",
      action_type_en AS "actionTypeEn",
      price,
      currency_code AS "currencyCode",
      workflow_type AS "workflowType",
      icon_asset_url AS "iconAssetUrl",
      icon_storage_key AS "iconStorageKey",
      sort_order AS "sortOrder",
      is_active AS "isActive",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM ONLY ${sqlClient(table)}
    WHERE country_code = ${country.code}
    ORDER BY sort_order ASC, name_en ASC
  `;
  return rows;
}

export async function createAdminSosCase(
  input: AdminSosCaseInput,
  adminId: string,
) {
  const { table } = await tableFor(input.countryCode);
  const rows = await sqlClient<AdminCaseRow[]>`
    INSERT INTO ${sqlClient(table)} (
      country_code, slug, name_ar, name_en, description_ar, description_en,
      action_type_ar, action_type_en, price, currency_code, workflow_type,
      icon_asset_url, icon_storage_key, sort_order, is_active,
      created_by_admin_id, updated_by_admin_id
    ) VALUES (
      ${input.countryCode}, ${input.slug}, ${input.nameAr}, ${input.nameEn},
      ${input.descriptionAr}, ${input.descriptionEn}, ${input.actionTypeAr},
      ${input.actionTypeEn}, ${input.price}, ${input.currencyCode},
      ${input.workflowType}, ${input.iconAssetUrl}, ${input.iconStorageKey},
      ${input.sortOrder}, ${input.isActive}, ${adminId}, ${adminId}
    )
    RETURNING
      id, country_code AS "countryCode", slug, name_ar AS "nameAr",
      name_en AS "nameEn", description_ar AS "descriptionAr",
      description_en AS "descriptionEn", action_type_ar AS "actionTypeAr",
      action_type_en AS "actionTypeEn", price,
      currency_code AS "currencyCode", workflow_type AS "workflowType",
      icon_asset_url AS "iconAssetUrl", icon_storage_key AS "iconStorageKey",
      sort_order AS "sortOrder", is_active AS "isActive",
      created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  return rows[0];
}

export async function updateAdminSosCase(
  id: string,
  input: AdminSosCaseInput,
  expectedUpdatedAt: Date,
  adminId: string,
) {
  const { table } = await tableFor(input.countryCode);
  const rows = await sqlClient<AdminCaseRow[]>`
    UPDATE ONLY ${sqlClient(table)}
    SET name_ar = ${input.nameAr}, name_en = ${input.nameEn},
        description_ar = ${input.descriptionAr},
        description_en = ${input.descriptionEn},
        action_type_ar = ${input.actionTypeAr},
        action_type_en = ${input.actionTypeEn}, price = ${input.price},
        currency_code = ${input.currencyCode},
        workflow_type = ${input.workflowType},
        icon_asset_url = ${input.iconAssetUrl},
        icon_storage_key = ${input.iconStorageKey},
        sort_order = ${input.sortOrder}, is_active = ${input.isActive},
        updated_at = now(), updated_by_admin_id = ${adminId}
    WHERE id = ${id} AND country_code = ${input.countryCode}
      AND slug = ${input.slug} AND updated_at = ${expectedUpdatedAt}
    RETURNING
      id, country_code AS "countryCode", slug, name_ar AS "nameAr",
      name_en AS "nameEn", description_ar AS "descriptionAr",
      description_en AS "descriptionEn", action_type_ar AS "actionTypeAr",
      action_type_en AS "actionTypeEn", price,
      currency_code AS "currencyCode", workflow_type AS "workflowType",
      icon_asset_url AS "iconAssetUrl", icon_storage_key AS "iconStorageKey",
      sort_order AS "sortOrder", is_active AS "isActive",
      created_at AS "createdAt", updated_at AS "updatedAt"
  `;
  if (!rows[0]) throw new SosCaseAdminError("stale_or_missing_case");
  return rows[0];
}
