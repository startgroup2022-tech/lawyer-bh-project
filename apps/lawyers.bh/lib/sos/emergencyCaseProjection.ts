import type { SosCaseSlug } from "@/lib/sos/caseTypes";
import type { SosWorkflow } from "@/lib/sos/admin-case-types";

export type EmergencyCaseCatalogItem = {
  id: string;
  slug: SosCaseSlug;
  label: { ar: string; en: string };
  helper: { ar: string; en: string };
  actionType: { ar: string; en: string };
  baseFeeBhd: number;
  currencyCode: string;
  iconKey: string;
  iconUrl: string | null;
  workflowType: SosWorkflow;
  sortOrder: number;
};

export type EmergencyCaseRow = {
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
  icon_asset_url: string | null;
  workflow_type: string | null;
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

export function isSosCaseSlug(value: string): value is SosCaseSlug {
  return VALID_SLUGS.has(value as SosCaseSlug);
}

export function mapEmergencyCaseRow(
  row: EmergencyCaseRow,
): EmergencyCaseCatalogItem | null {
  if (!isSosCaseSlug(row.slug)) return null;
  const price = Number(row.price);
  if (!Number.isFinite(price) || price <= 0) return null;
  const sortOrder = Number(row.sort_order);

  return {
    id: row.id,
    slug: row.slug,
    label: { ar: row.name_ar, en: row.name_en },
    helper: {
      ar: row.description_ar ?? "",
      en: row.description_en ?? "",
    },
    actionType: {
      ar: row.action_type_ar ?? "",
      en: row.action_type_en ?? "",
    },
    baseFeeBhd: price,
    currencyCode: row.currency_code,
    iconKey: row.icon_key ?? "shield-alert",
    iconUrl: row.icon_asset_url?.trim() || null,
    workflowType:
      row.workflow_type === "direct_consultation"
        ? "direct_consultation"
        : "emergency_dispatch",
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}
