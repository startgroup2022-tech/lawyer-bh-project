import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import type { CountryProduct } from './languages';

export type CountryPlatformState = {
  countryCode: string;
  product: CountryProduct;
  enabled: boolean;
  tablesProvisioned: boolean;
};

function rows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows: unknown }).rows)) return (result as { rows: T[] }).rows;
  return [];
}

function countryCode(value: string) {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) throw new Error('Invalid country code');
  return code;
}

function product(value: CountryProduct): CountryProduct {
  if (value !== 'lawyers' && value !== 'legal_sos') throw new Error('Invalid country product');
  return value;
}

async function requireCountry(code:string) {
  const result = await db.execute(sql`SELECT code FROM public.countries WHERE code = ${code} LIMIT 1`);
  if (!rows<{code:string}>(result)[0]) throw new Error('COUNTRY_PLATFORM_NOT_FOUND');
}

export async function activateCountryPlatform(code: string, requestedProduct: CountryProduct): Promise<CountryPlatformState> {
  const normalizedCode = countryCode(code);
  const normalizedProduct = product(requestedProduct);
  await requireCountry(normalizedCode);
  const result = await db.execute(sql`
    SELECT country_code AS "countryCode", platform AS product, enabled,
           tables_provisioned AS "tablesProvisioned"
    FROM public.activate_country_platform(${normalizedCode}, ${normalizedProduct})
  `);
  const state = rows<CountryPlatformState>(result)[0];
  if (!state) throw new Error('COUNTRY_PLATFORM_ACTIVATION_FAILED');
  return state;
}

export async function setCountryPlatformEnabled(code: string, requestedProduct: CountryProduct, enabled: boolean): Promise<CountryPlatformState> {
  if (enabled) return activateCountryPlatform(code, requestedProduct);
  const normalizedCode = countryCode(code);
  const normalizedProduct = product(requestedProduct);
  await requireCountry(normalizedCode);
  const result = normalizedProduct === 'lawyers'
    ? await db.execute(sql`
        UPDATE public.country_channel_settings
        SET lawyers_platform_enabled = false, website_enabled = false, updated_at = now()
        WHERE code = ${normalizedCode}
        RETURNING code AS "countryCode", 'lawyers'::text AS product, false AS enabled,
          (SELECT tables_provisioned FROM public.countries WHERE code = ${normalizedCode}) AS "tablesProvisioned"
      `)
    : await db.execute(sql`
        UPDATE public.country_channel_settings
        SET legal_sos_enabled = false, app_enabled = false, updated_at = now()
        WHERE code = ${normalizedCode}
        RETURNING code AS "countryCode", 'legal_sos'::text AS product, false AS enabled,
          (SELECT tables_provisioned FROM public.countries WHERE code = ${normalizedCode}) AS "tablesProvisioned"
      `);
  const state = rows<CountryPlatformState>(result)[0];
  if (!state) throw new Error('COUNTRY_PLATFORM_NOT_FOUND');
  return state;
}
