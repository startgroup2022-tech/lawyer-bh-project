import type { CountryProduct } from './languages';

export type { CountryProduct } from './languages';

// ISO 3166-1 alpha-2 countries and territories. Names use the runtime's CLDR data.
const codes = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(' ');
const ar = new Intl.DisplayNames(['ar'], {type:'region'});
const en = new Intl.DisplayNames(['en'], {type:'region'});
export const countryCatalog = codes.map(code => ({code, nameAr:ar.of(code) ?? code, nameEn:en.of(code) ?? code}));
export type Channel = 'app' | 'website' | 'registration';
export type CountrySetting = {
  code:string;
  appEnabled:boolean;
  websiteEnabled:boolean;
  backgroundUrl:string|null;
  backgroundOpacity?:number;
  backgroundOverlayOpacity?:number;
  backgroundColor?:string|null;
  websiteUrl?:string|null;
  legalSosEnabled?:boolean;
  lawyersPlatformEnabled?:boolean;
  lawyersPlatformUrl?:string|null;
  translations?:Record<string,string>;
  languages?:string[];
};
export type CountryInfrastructure = {code:string; isActive:boolean; tablesProvisioned:boolean; phoneCode:string|null; currencyCode:string; defaultLocale:string};
export function mergeCountrySettings(settings:CountrySetting[], infrastructure:CountryInfrastructure[]) {
  const configured = new Map(settings.map(c => [c.code, c]));
  const provisioned = new Map(infrastructure.map(c => [c.code, c]));
  return countryCatalog.map(country => {
    const setting = configured.get(country.code);
    const info = provisioned.get(country.code);
    const legalSosEnabled = setting?.legalSosEnabled ?? setting?.appEnabled ?? false;
    const lawyersPlatformEnabled = setting?.lawyersPlatformEnabled ?? setting?.websiteEnabled ?? false;
    const lawyersPlatformUrl = setting?.lawyersPlatformUrl ?? setting?.websiteUrl ?? null;
    return {...country,
      legalSosEnabled, lawyersPlatformEnabled, lawyersPlatformUrl,
      translations:setting?.translations ?? {ar:country.nameAr, en:country.nameEn}, languages:setting?.languages ?? [],
      appEnabled:legalSosEnabled, websiteEnabled:lawyersPlatformEnabled,
      backgroundUrl:setting?.backgroundUrl ?? null, websiteUrl:lawyersPlatformUrl, tablesProvisioned:info?.tablesProvisioned ?? false,
      backgroundOpacity:setting?.backgroundOpacity ?? 100,
      backgroundOverlayOpacity:setting?.backgroundOverlayOpacity ?? 0,
      backgroundColor:setting?.backgroundColor ?? null,
      servicesActive: !!info?.isActive && !!info?.tablesProvisioned,
      phoneCode:info?.phoneCode ?? null, currencyCode:info?.currencyCode ?? null, defaultLocale:info?.defaultLocale ?? 'en'};
  });
}
export type ManagedCountry = ReturnType<typeof mergeCountrySettings>[number];
export function parseCountryProduct(value: unknown): CountryProduct {
  if (value === 'lawyers' || value === 'website') return 'lawyers';
  if (value === 'legal_sos' || value === 'app') return 'legal_sos';
  throw new Error('Invalid country product');
}
export function visibleCountries(countries:ManagedCountry[], product:CountryProduct | Channel) {
  if (product === 'registration') return countries;
  const canonical = parseCountryProduct(product);
  return countries.filter(c => canonical === 'legal_sos' ? c.legalSosEnabled : c.lawyersPlatformEnabled);
}
export type CountryAppearancePatch = Partial<
  Pick<CountrySetting, 'lawyersPlatformUrl' | 'backgroundUrl' | 'backgroundOpacity' | 'backgroundOverlayOpacity' | 'backgroundColor'>
>;

const APPEARANCE_KEYS = [
  'lawyersPlatformUrl',
  'backgroundUrl',
  'backgroundOpacity',
  'backgroundOverlayOpacity',
  'backgroundColor',
] as const;

export function parseCountryPatch(input:unknown): CountryAppearancePatch {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid settings');
  const entries = Object.entries(input);
  if (!entries.length) throw new Error('Empty settings');
  return Object.fromEntries(entries.map(([key,value]) => {
    if (!(APPEARANCE_KEYS as readonly string[]).includes(key)) throw new Error('Invalid setting');
    if (key === 'backgroundOpacity' || key === 'backgroundOverlayOpacity') return [key, normalizeOpacity(value)];
    if (key === 'backgroundColor') return [key, normalizeBackgroundColor(value)];
    return [key, normalizeWebsiteUrl(value)];
  }));
}

/** Whole percentages only, so the stored value is exactly what the admin set. */
function normalizeOpacity(value:unknown):number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error('Opacity must be a whole percentage between 0 and 100');
  }
  return value;
}

/** `null`/empty clears the colour; anything else must be a `#RRGGBB` literal. */
function normalizeBackgroundColor(value:unknown):string|null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(value.trim())) {
    throw new Error('Use a #RRGGBB colour');
  }
  return value.trim().toUpperCase();
}

function normalizeWebsiteUrl(value:unknown):string|null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Invalid website URL');
  const text = value.trim();
  if (!text) return null;
  if (/\s/.test(text) || text.startsWith('//')) throw new Error('Invalid website URL');
  const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.') || url.href.length > 2048) throw new Error('Use a public HTTPS website URL');
  return url.href;
}
