import "server-only";

import { listAppointmentAvailability } from "@/lib/booking/appointmentAvailability";
import { listConsultationMethods } from "@/lib/booking/consultationMethodCatalog";
import { SERVICE_STAGE_CATALOG } from "@/lib/booking/serviceStageCatalog";
import { sqlClient } from "@/lib/db/client";
import { buildCountryTableSet, getActiveCountry } from "@/lib/db/country-tables";
import { getPublicLawyers } from "@/lib/publicLawyers";

export async function listLiveConsultationMethods(language: "ar" | "en") {
  const country = await getActiveCountry("BH");
  if (!country) return [];
  const methods = await listConsultationMethods(country);
  return methods.map((method) => ({
    id: method.id,
    key: method.code,
    name: method.name[language],
    price: method.price,
    currencyCode: method.currencyCode,
    durationMinutes: method.durationMinutes,
  }));
}

export function listLiveServiceStages(language: "ar" | "en") {
  return SERVICE_STAGE_CATALOG.map((service) => ({
    key: service.key,
    name: service.name[language],
    description: service.description[language],
    requiresConsultationMethod: service.requiresConsultationMethod,
    fixedAmountBhd: service.fixedAmountBhd,
    officeOnly: service.officeOnly,
  }));
}

export async function listLiveLegalCases(language: "ar" | "en") {
  const country = await getActiveCountry("BH");
  if (!country) return [];
  const tables = buildCountryTableSet(country);
  const rows = await sqlClient<Array<{ id: string; key: string; name_ar: string; name_en: string; category_key: string }>>`
    SELECT lc.id, lc.key, lc.name_ar, lc.name_en, category.key AS category_key
    FROM ${sqlClient(tables.legal_cases)} AS lc
    INNER JOIN ${sqlClient(tables.legal_case_categories)} AS category
      ON category.id = lc.category_id AND category.country_code = lc.country_code
    WHERE lc.country_code = ${country.code} AND lc.is_active = true AND category.is_active = true
    ORDER BY category.sort_order, lc.sort_order
  `;
  return rows.map((row) => ({ id: row.id, key: row.key, name: language === "ar" ? row.name_ar : row.name_en, categoryKey: row.category_key }));
}

export async function listLiveLawyers(language: "ar" | "en", categoryKey?: string) {
  const providers = await getPublicLawyers("BH");
  return providers
    .filter((provider) => !categoryKey || provider.specialtyMain === categoryKey || provider.specialtySubs.includes(categoryKey as never) || provider.specialties.includes(categoryKey as never))
    .slice(0, 20)
    .map((provider) => ({
      id: provider.id,
      name: language === "ar" ? provider.nameAr : provider.nameEn,
      subtitle: language === "ar" ? provider.subtitleAr : provider.subtitleEn,
      workingHours: provider.workingHours,
      rating: provider.rating,
    }));
}

export function listLiveAvailability(language: "ar" | "en", now = new Date()) {
  return listAppointmentAvailability(language, now);
}
