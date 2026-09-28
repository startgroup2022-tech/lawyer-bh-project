export type LanguageCode = string;
export type LanguageDirection = 'rtl' | 'ltr';
export type LanguageStatus = 'draft' | 'published';
export type CountryProduct = 'lawyers' | 'legal_sos';

export type PlatformLanguage = {
  code: LanguageCode;
  adminName: string;
  nativeName: string;
  direction: LanguageDirection;
  status: LanguageStatus;
};

export type CountryTranslation = {
  countryCode: string;
  languageCode: LanguageCode;
  name: string;
};

export type CountryLanguageSelection = {
  enabledLanguages: LanguageCode[];
  defaultLanguage: LanguageCode;
  translations: Record<LanguageCode, string>;
};

export const SOURCE_CONTROLLED_PUBLIC_LOCALES = ['ar', 'en', 'tr'] as const;

export function languageReadiness(
  language: Pick<PlatformLanguage, 'code' | 'adminName' | 'nativeName' | 'direction'>,
) {
  const catalogueReady = Boolean(
    language.adminName.trim()
    && language.nativeName.trim()
    && (language.direction === 'rtl' || language.direction === 'ltr'),
  );
  const normalizedCode = language.code.trim().toLowerCase();
  const fullInterfaceReady = catalogueReady
    && SOURCE_CONTROLLED_PUBLIC_LOCALES.some(code => code === normalizedCode);
  return { catalogueReady, fullInterfaceReady };
}

const languageCodePattern = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/;
const languageCreateKeys = new Set(['code', 'adminName', 'nativeName', 'direction']);
const languageUpdateKeys = new Set(['adminName', 'nativeName', 'direction']);
const countryLanguageKeys = new Set(['enabledLanguages', 'defaultLanguage', 'translations']);

function record(input: unknown, message: string): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(message);
  return input as Record<string, unknown>;
}

function strictKeys(value: Record<string, unknown>, allowed: Set<string>, message: string) {
  if (Object.keys(value).some(key => !allowed.has(key))) throw new Error(message);
}

function languageCode(value: unknown): LanguageCode {
  if (typeof value !== 'string') throw new Error('Invalid language code');
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 35 || !languageCodePattern.test(normalized)) throw new Error('Invalid language code');
  return normalized;
}

function label(value: unknown, field: string, maximum = 100): string {
  if (typeof value !== 'string') throw new Error(`Invalid ${field}`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) throw new Error(`Invalid ${field}`);
  return normalized;
}

function direction(value: unknown): LanguageDirection {
  if (value !== 'rtl' && value !== 'ltr') throw new Error('Invalid language direction');
  return value;
}

export function parseLanguageCreate(input: unknown): PlatformLanguage {
  const value = record(input, 'Invalid language');
  strictKeys(value, languageCreateKeys, 'Invalid language field');
  return {
    code: languageCode(value.code),
    adminName: label(value.adminName, 'administrative name'),
    nativeName: label(value.nativeName, 'native name'),
    direction: direction(value.direction),
    status: 'draft',
  };
}

export function parseLanguageUpdate(
  input: unknown,
): Partial<Pick<PlatformLanguage, 'adminName' | 'nativeName' | 'direction'>> {
  const value = record(input, 'Invalid language update');
  strictKeys(value, languageUpdateKeys, 'Invalid language update field');
  if (Object.keys(value).length === 0) throw new Error('Empty language update');
  const update: Partial<Pick<PlatformLanguage, 'adminName' | 'nativeName' | 'direction'>> = {};
  if ('adminName' in value) update.adminName = label(value.adminName, 'administrative name');
  if ('nativeName' in value) update.nativeName = label(value.nativeName, 'native name');
  if ('direction' in value) update.direction = direction(value.direction);
  return update;
}

export function parseCountryLanguageUpdate(input: unknown): CountryLanguageSelection {
  const value = record(input, 'Invalid country languages');
  strictKeys(value, countryLanguageKeys, 'Invalid country language field');
  if (!Array.isArray(value.enabledLanguages) || value.enabledLanguages.length === 0) {
    throw new Error('At least one language must be enabled');
  }
  const enabledLanguages = value.enabledLanguages.map(languageCode);
  if (new Set(enabledLanguages).size !== enabledLanguages.length) throw new Error('Duplicate enabled language');
  const defaultLanguage = languageCode(value.defaultLanguage);
  if (!enabledLanguages.includes(defaultLanguage)) throw new Error('Default language must be enabled');

  const inputTranslations = record(value.translations, 'Invalid country translations');
  const translations: Record<string, string> = {};
  for (const [rawCode, rawName] of Object.entries(inputTranslations)) {
    const code = languageCode(rawCode);
    if (!enabledLanguages.includes(code) || code in translations) throw new Error('Translation language must be enabled once');
    translations[code] = label(rawName, 'country translation', 200);
  }
  if (enabledLanguages.some(code => !translations[code])) throw new Error('Every enabled language needs a translation');
  return {enabledLanguages, defaultLanguage, translations};
}
