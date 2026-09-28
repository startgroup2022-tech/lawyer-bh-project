import "server-only";

import { sqlClient } from "@/lib/db/client";
import {
  buildCountryTableSet,
  type ActiveCountry,
} from "@/lib/db/country-tables";

export type PaidConsultationMethodCode = string;

export type ConsultationMethodCatalogItem = {
  id: string;
  code: PaidConsultationMethodCode;
  name: {
    ar: string;
    en: string;
  };
  price: number;
  currencyCode: string;
  durationMinutes: number;
  iconKey: string;
  sortOrder: number;
};

type ConsultationMethodRow = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  price: string | number;
  currency_code: string;
  duration_minutes: string | number;
  icon_key: string | null;
  sort_order: string | number;
};

export function isPaidConsultationMethodCode(
  value: string,
): value is PaidConsultationMethodCode {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function mapRow(
  row: ConsultationMethodRow,
): ConsultationMethodCatalogItem | null {
  if (!isPaidConsultationMethodCode(row.code)) {
    return null;
  }

  const price = Number(row.price);
  const durationMinutes = Number(row.duration_minutes);
  const sortOrder = Number(row.sort_order);

  if (
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 0
  ) {
    return null;
  }

  return {
    id: row.id,
    code: row.code,
    name: {
      ar: row.name_ar,
      en: row.name_en,
    },
    price,
    currencyCode: row.currency_code,
    durationMinutes,
    iconKey: row.icon_key ?? row.code,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

export async function listConsultationMethods(
  country: ActiveCountry,
): Promise<ConsultationMethodCatalogItem[]> {
  const tables = buildCountryTableSet(country);

  const rows = await sqlClient<ConsultationMethodRow[]>`
    SELECT
      id,
      code,
      name_ar,
      name_en,
      price,
      currency_code,
      duration_minutes,
      icon_key,
      sort_order
    FROM ONLY ${sqlClient(tables.consultation_methods)}
    WHERE country_code = ${country.code}
      AND is_active = true
    ORDER BY sort_order ASC, name_en ASC
  `;

  return rows
    .map(mapRow)
    .filter(
      (item): item is ConsultationMethodCatalogItem => item !== null,
    );
}

export async function findConsultationMethod(
  country: ActiveCountry,
  code: string,
): Promise<ConsultationMethodCatalogItem | null> {
  if (!isPaidConsultationMethodCode(code)) {
    return null;
  }

  const tables = buildCountryTableSet(country);

  const rows = await sqlClient<ConsultationMethodRow[]>`
    SELECT
      id,
      code,
      name_ar,
      name_en,
      price,
      currency_code,
      duration_minutes,
      icon_key,
      sort_order
    FROM ONLY ${sqlClient(tables.consultation_methods)}
    WHERE country_code = ${country.code}
      AND code = ${code}
      AND is_active = true
    LIMIT 1
  `;

  return rows[0] ? mapRow(rows[0]) : null;
}
