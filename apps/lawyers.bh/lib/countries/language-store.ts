import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  parseCountryLanguageUpdate,
  parseLanguageCreate,
  parseLanguageUpdate,
  type CountryLanguageSelection,
  type PlatformLanguage,
} from './languages';

type Executor = { execute: (query: ReturnType<typeof sql>) => Promise<unknown> };

function rows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray((result as { rows: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

function normalizedLanguageCode(code: string) {
  const value = code.trim().toLowerCase();
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(value) || value.length > 35) throw new Error('Invalid language code');
  return value;
}

function normalizedCountryCode(code: string) {
  const value = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(value)) throw new Error('Invalid country code');
  return value;
}

export async function listLanguages(): Promise<PlatformLanguage[]> {
  const result = await db.execute(sql`
    SELECT code, admin_name AS "adminName", native_name AS "nativeName", direction, status
    FROM public.platform_languages
    ORDER BY admin_name, code
  `);
  return rows<PlatformLanguage>(result);
}

export async function createLanguage(input: unknown, adminId: string): Promise<PlatformLanguage> {
  const language = parseLanguageCreate(input);
  const result = await db.execute(sql`
    INSERT INTO public.platform_languages (code, admin_name, native_name, direction, status, updated_by)
    VALUES (${language.code}, ${language.adminName}, ${language.nativeName}, ${language.direction}, 'draft', ${adminId}::uuid)
    RETURNING code, admin_name AS "adminName", native_name AS "nativeName", direction, status
  `);
  const created = rows<PlatformLanguage>(result)[0];
  if (!created) throw new Error('LANGUAGE_CREATE_FAILED');
  return created;
}

export async function updateLanguage(code: string, input: unknown, adminId: string): Promise<PlatformLanguage> {
  const languageCode = normalizedLanguageCode(code);
  const patch = parseLanguageUpdate(input);
  const result = await db.execute(sql`
    UPDATE public.platform_languages
    SET admin_name = COALESCE(${patch.adminName ?? null}, admin_name),
        native_name = COALESCE(${patch.nativeName ?? null}, native_name),
        direction = COALESCE(${patch.direction ?? null}, direction),
        updated_by = ${adminId}::uuid,
        updated_at = now()
    WHERE code = ${languageCode}
    RETURNING code, admin_name AS "adminName", native_name AS "nativeName", direction, status
  `);
  const updated = rows<PlatformLanguage>(result)[0];
  if (!updated) throw new Error('LANGUAGE_NOT_FOUND');
  return updated;
}

export async function publishLanguage(code: string, adminId: string): Promise<PlatformLanguage> {
  const languageCode = normalizedLanguageCode(code);
  return db.transaction(async tx => {
    const currentResult = await tx.execute(sql`
      SELECT code, admin_name AS "adminName", native_name AS "nativeName", direction, status
      FROM public.platform_languages WHERE code = ${languageCode} FOR UPDATE
    `);
    const current = rows<PlatformLanguage>(currentResult)[0];
    if (!current) throw new Error('LANGUAGE_NOT_FOUND');
    if (!current.adminName?.trim() || !current.nativeName?.trim() || !['rtl', 'ltr'].includes(current.direction)) {
      throw new Error('LANGUAGE_NOT_READY');
    }
    if (current.status === 'published') return current;
    const result = await tx.execute(sql`
      UPDATE public.platform_languages
      SET status = 'published', updated_by = ${adminId}::uuid, updated_at = now()
      WHERE code = ${languageCode}
      RETURNING code, admin_name AS "adminName", native_name AS "nativeName", direction, status
    `);
    return rows<PlatformLanguage>(result)[0] ?? { ...current, status: 'published' };
  });
}

export async function saveCountryLanguages(countryCode: string, input: unknown) {
  const code = normalizedCountryCode(countryCode);
  const selection: CountryLanguageSelection = parseCountryLanguageUpdate(input);
  return db.transaction(async (tx: Executor) => {
    const country = rows<{ code: string }>(await tx.execute(sql`
      SELECT code FROM public.countries WHERE code = ${code} FOR UPDATE
    `))[0];
    if (!country) throw new Error('COUNTRY_NOT_FOUND');

    const languageRows = rows<{ code: string; status: string }>(await tx.execute(sql`
      SELECT code, status FROM public.platform_languages
      WHERE code IN (${sql.join(selection.enabledLanguages.map(language => sql`${language}`), sql`, `)})
      ORDER BY code FOR UPDATE
    `));
    const published = new Set(languageRows.filter(language => language.status === 'published').map(language => language.code));
    if (selection.enabledLanguages.some(language => !published.has(language))) throw new Error('LANGUAGE_NOT_PUBLISHED');

    await tx.execute(sql`DELETE FROM public.country_language_settings WHERE country_code = ${code}`);
    await tx.execute(sql`
      INSERT INTO public.country_language_settings (country_code, language_code, is_default)
      SELECT ${code}, item.code, item.code = ${selection.defaultLanguage}
      FROM jsonb_to_recordset(${JSON.stringify(selection.enabledLanguages.map(language => ({ code: language })))}::jsonb) AS item(code text)
    `);
    for (const [language, name] of Object.entries(selection.translations)) {
      await tx.execute(sql`
        INSERT INTO public.country_translations (country_code, language_code, name)
        VALUES (${code}, ${language}, ${name})
        ON CONFLICT (country_code, language_code) DO UPDATE SET name = EXCLUDED.name
      `);
    }
    await tx.execute(sql`
      UPDATE public.countries SET default_locale = ${selection.defaultLanguage}, updated_at = now()
      WHERE code = ${code}
    `);
    return { countryCode: code, ...selection };
  });
}
