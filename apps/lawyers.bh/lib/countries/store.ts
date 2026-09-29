import 'server-only';
import { sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { mergeCountrySettings } from './catalog';
import type { CountrySetting } from './catalog';

export async function saveCountrySettings(code:string, patch:Partial<Omit<CountrySetting,'code'>>) {
  const compatiblePatch = {...patch};
  if (Object.hasOwn(patch, 'appEnabled') && !Object.hasOwn(patch, 'legalSosEnabled')) {
    compatiblePatch.legalSosEnabled = patch.appEnabled;
  }
  if (Object.hasOwn(patch, 'websiteEnabled') && !Object.hasOwn(patch, 'lawyersPlatformEnabled')) {
    compatiblePatch.lawyersPlatformEnabled = patch.websiteEnabled;
  }
  if (Object.hasOwn(patch, 'websiteUrl') && !Object.hasOwn(patch, 'lawyersPlatformUrl')) {
    compatiblePatch.lawyersPlatformUrl = patch.websiteUrl;
  }
  if (Object.hasOwn(patch, 'lawyersPlatformUrl') && !Object.hasOwn(patch, 'websiteUrl')) {
    compatiblePatch.websiteUrl = patch.lawyersPlatformUrl;
  }
  await db.insert(schema.countryChannelSettings).values({code, ...compatiblePatch})
    .onConflictDoUpdate({target:schema.countryChannelSettings.code, set:{...compatiblePatch, updatedAt:new Date()}});
}

export async function loadManagedCountries() {
  const [settingsResult, infrastructureResult, translationsResult, membershipsResult] = await Promise.all([
    db.execute(sql`SELECT code, app_enabled AS "appEnabled", website_enabled AS "websiteEnabled",
      legal_sos_enabled AS "legalSosEnabled", lawyers_platform_enabled AS "lawyersPlatformEnabled",
      lawyers_platform_url AS "lawyersPlatformUrl", website_url AS "websiteUrl", background_url AS "backgroundUrl",
      background_opacity AS "backgroundOpacity", background_overlay_opacity AS "backgroundOverlayOpacity",
      background_color AS "backgroundColor"
      FROM public.country_channel_settings`),
    db.execute(sql`SELECT code, is_active AS "isActive", tables_provisioned AS "tablesProvisioned",
      phone_code AS "phoneCode", currency_code AS "currencyCode", default_locale AS "defaultLocale"
      FROM public.countries`),
    db.execute(sql`SELECT country_code AS "countryCode", language_code AS "languageCode", name
      FROM public.country_translations ORDER BY country_code, language_code`),
    db.execute(sql`SELECT country_code AS "countryCode", language_code AS "languageCode", is_default AS "isDefault"
      FROM public.country_language_settings ORDER BY country_code, language_code`),
  ]);
  const unwrap = <T,>(result: unknown): T[] => Array.isArray(result)
    ? result as T[]
    : result && typeof result === 'object' && 'rows' in result && Array.isArray((result as {rows:unknown}).rows)
      ? (result as {rows:T[]}).rows : [];
  const settings = unwrap<CountrySetting>(settingsResult);
  const infrastructure = unwrap<{code:string;isActive:boolean;tablesProvisioned:boolean;phoneCode:string|null;currencyCode:string;defaultLocale:string}>(infrastructureResult);
  const translations = unwrap<{countryCode:string;languageCode:string;name:string}>(translationsResult);
  const memberships = unwrap<{countryCode:string;languageCode:string;isDefault:boolean}>(membershipsResult);
  const translationsByCountry = new Map<string, Record<string,string>>();
  for (const item of translations) translationsByCountry.set(item.countryCode, {...translationsByCountry.get(item.countryCode), [item.languageCode]:item.name});
  const languagesByCountry = new Map<string,string[]>();
  for (const item of memberships) languagesByCountry.set(item.countryCode, [...(languagesByCountry.get(item.countryCode) ?? []), item.languageCode]);
  const settingsByCountry = new Map(settings.map(setting => [setting.code, setting]));
  const normalizedCountryCodes = new Set([...translationsByCountry.keys(), ...languagesByCountry.keys()]);
  const enriched = [...new Set([...settingsByCountry.keys(), ...normalizedCountryCodes])].map(code => ({
    ...(settingsByCountry.get(code) ?? {
      code, appEnabled:false, websiteEnabled:false, backgroundUrl:null, websiteUrl:null,
      legalSosEnabled:false, lawyersPlatformEnabled:false, lawyersPlatformUrl:null,
      backgroundOpacity:100, backgroundOverlayOpacity:0, backgroundColor:null,
    }),
    translations:translationsByCountry.get(code), languages:languagesByCountry.get(code),
  }));
  return mergeCountrySettings(enriched, infrastructure);
}
