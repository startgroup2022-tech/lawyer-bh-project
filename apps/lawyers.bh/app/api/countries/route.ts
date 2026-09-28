import { NextResponse } from 'next/server';
import { loadManagedCountries } from '@/lib/countries/store';
import { visibleCountries } from '@/lib/countries/catalog';
import type { CountryProduct } from '@/lib/countries/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function canonicalProduct(value:string|undefined):CountryProduct|null {
  if (value === undefined) return null;
  if (value === 'lawyers' || value === 'legal_sos') return value;
  throw new Error('Invalid product');
}

function compatibilityChannel(value:string|undefined):CountryProduct|null {
  if (value === undefined) return null;
  if (value === 'website') return 'lawyers';
  if (value === 'app') return 'legal_sos';
  throw new Error('Invalid channel');
}

function requestedProduct(url: URL): CountryProduct | 'registration' {
  const productValues = url.searchParams.getAll('product');
  const channelValues = url.searchParams.getAll('channel');
  if (productValues.length > 1 || channelValues.length > 1) throw new Error('Duplicate country selector');
  if (channelValues[0] === 'registration' && productValues.length === 0) return 'registration';
  const product = canonicalProduct(productValues[0]);
  const channel = compatibilityChannel(channelValues[0]);
  if (product && channel && product !== channel) throw new Error('Conflicting country selectors');
  return product ?? channel ?? 'lawyers';
}

export async function GET(request:Request) {
  let product:CountryProduct | 'registration';
  try {
    product = requestedProduct(new URL(request.url));
  } catch {
    return NextResponse.json({ok:false,error:'Invalid country selector'}, {status:400,headers:{'Cache-Control':'no-store'}});
  }
  try {
    const countries = visibleCountries(await loadManagedCountries(), product).map(
      (country) => {
        const translations = Object.fromEntries(country.languages.flatMap((language) => {
          const name = country.translations[language];
          return name ? [[language, name]] : [];
        }));
        return {
          code:country.code,
          translations,
          enabledLanguages:country.languages,
          defaultLanguage:country.defaultLocale,
          legalSosEnabled:country.legalSosEnabled,
          lawyersPlatformEnabled:country.lawyersPlatformEnabled,
          nameAr:country.translations.ar ?? country.nameAr,
          nameEn:country.translations.en ?? country.nameEn,
          appEnabled:country.legalSosEnabled,
          websiteEnabled:country.lawyersPlatformEnabled,
          backgroundUrl:country.backgroundUrl,
          tablesProvisioned:country.tablesProvisioned,
          servicesActive:country.servicesActive,
          phoneCode:country.phoneCode,
          currencyCode:country.currencyCode,
          defaultLocale:country.defaultLocale,
        };
      },
    );
    return NextResponse.json({ok:true,countries}, {headers:{'Cache-Control':'no-store'}});
  } catch {
    return NextResponse.json({ok:false, error:'Could not load countries', countries:[]}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
