import {NextResponse} from 'next/server';
import {requireSuperAdmin} from '@/lib/auth/admin-access';
import {countryCatalog} from '@/lib/countries/catalog';
import {setCountryPlatformEnabled} from '@/lib/countries/platform-activation';
import type {CountryProduct} from '@/lib/countries/languages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = {params:Promise<{code:string}>};

function json(body:unknown, status=200) {
  return NextResponse.json(body, {status, headers:{'Cache-Control':'no-store'}});
}

function countryCode(value:string) {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || !countryCatalog.some(country => country.code === code)) throw new Error('Invalid country code');
  return code;
}

function platformUpdate(input:unknown):{product:CountryProduct;enabled:boolean} {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid platform update');
  const value = input as Record<string,unknown>;
  if (Object.keys(value).length !== 2 || !Object.hasOwn(value, 'product') || !Object.hasOwn(value, 'enabled')) throw new Error('Invalid platform update');
  if (value.product !== 'lawyers' && value.product !== 'legal_sos') throw new Error('Invalid platform');
  if (typeof value.enabled !== 'boolean') throw new Error('Invalid platform state');
  return {product:value.product, enabled:value.enabled};
}

export async function PUT(request:Request, context:Context) {
  if (!(await requireSuperAdmin())) return json({ok:false, error:'FORBIDDEN'}, 403);
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ok:false, error:'INVALID_ORIGIN'}, 403);
  let code:string;
  let input:ReturnType<typeof platformUpdate>;
  try {
    code = countryCode((await context.params).code);
    input = platformUpdate(await request.json());
  } catch {
    return json({ok:false, error:'INVALID_COUNTRY_PLATFORM'}, 400);
  }
  try {
    return json({ok:true, platform:await setCountryPlatformEnabled(code, input.product, input.enabled)});
  } catch (error) {
    if (error instanceof Error && error.message === 'COUNTRY_PLATFORM_NOT_FOUND') return json({ok:false, error:'COUNTRY_NOT_FOUND'}, 404);
    return json({ok:false, error:'COUNTRY_PLATFORM_UNAVAILABLE'}, 503);
  }
}
