import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin-access';
import { countryCatalog, parseCountryPatch } from '@/lib/countries/catalog';
import { loadManagedCountries, saveCountrySettings } from '@/lib/countries/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function json(body:unknown, status=200) {
  return NextResponse.json(body, {status, headers:{'Cache-Control':'no-store'}});
}
export async function GET() {
  if (!(await requireSuperAdmin())) return json({ok:false,error:'FORBIDDEN'},403);
  try {
    return json({ok:true, countries:await loadManagedCountries()});
  } catch {
    return json({ok:false,error:'COUNTRY_SETTINGS_UNAVAILABLE'},503);
  }
}
export async function PATCH(request:Request) {
  if (!(await requireSuperAdmin())) return json({ok:false,error:'FORBIDDEN'},403);
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ok:false,error:'INVALID_ORIGIN'},403);
  let code:string;
  let patch:ReturnType<typeof parseCountryPatch>;
  try {
    const body = await request.json();
    ({code} = body);
    if (!countryCatalog.some(c => c.code === code)) throw new Error('Unknown country');
    const values = {...body};
    delete values.code;
    patch = parseCountryPatch(values);
  } catch {
    return json({ok:false,error:'INVALID_COUNTRY_SETTINGS'},400);
  }
  try {
    await saveCountrySettings(code, patch);
    return json({ok:true,settings:patch});
  } catch {
    return json({ok:false,error:'COUNTRY_SETTINGS_UNAVAILABLE'},503);
  }
}
