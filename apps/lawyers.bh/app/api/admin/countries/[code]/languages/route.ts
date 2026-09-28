import {NextResponse} from 'next/server';
import {requireSuperAdmin} from '@/lib/auth/admin-access';
import {countryCatalog} from '@/lib/countries/catalog';
import {saveCountryLanguages} from '@/lib/countries/language-store';
import {parseCountryLanguageUpdate} from '@/lib/countries/languages';

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

export async function PUT(request:Request, context:Context) {
  if (!(await requireSuperAdmin())) return json({ok:false, error:'FORBIDDEN'}, 403);
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ok:false, error:'INVALID_ORIGIN'}, 403);
  let code:string;
  let input:ReturnType<typeof parseCountryLanguageUpdate>;
  try {
    code = countryCode((await context.params).code);
    input = parseCountryLanguageUpdate(await request.json());
  } catch {
    return json({ok:false, error:'INVALID_COUNTRY_LANGUAGES'}, 400);
  }
  try {
    return json({ok:true, country:await saveCountryLanguages(code, input)});
  } catch (error) {
    if (error instanceof Error && error.message === 'LANGUAGE_NOT_PUBLISHED') return json({ok:false, error:'LANGUAGE_NOT_PUBLISHED'}, 400);
    if (error instanceof Error && error.message === 'COUNTRY_NOT_FOUND') return json({ok:false, error:'COUNTRY_NOT_FOUND'}, 404);
    return json({ok:false, error:'COUNTRY_LANGUAGES_UNAVAILABLE'}, 503);
  }
}
