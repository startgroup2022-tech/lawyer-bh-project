import {NextResponse} from 'next/server';
import {requireSuperAdmin} from '@/lib/auth/admin-access';
import {publishLanguage, updateLanguage} from '@/lib/countries/language-store';
import {parseLanguageUpdate} from '@/lib/countries/languages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = {params:Promise<{code:string}>};

function json(body:unknown, status=200) {
  return NextResponse.json(body, {status, headers:{'Cache-Control':'no-store'}});
}

function languageCode(value:string) {
  const code = value.trim().toLowerCase();
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(code) || code.length > 35) throw new Error('Invalid language code');
  return code;
}

export async function PATCH(request:Request, context:Context) {
  const admin = await requireSuperAdmin();
  if (!admin) return json({ok:false, error:'FORBIDDEN'}, 403);
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ok:false, error:'INVALID_ORIGIN'}, 403);
  let code:string;
  let operation:{publish:true} | {patch:ReturnType<typeof parseLanguageUpdate>};
  try {
    code = languageCode((await context.params).code);
    const body:unknown = await request.json();
    if (body && typeof body === 'object' && !Array.isArray(body)
      && Object.keys(body).length === 1 && (body as {publish?:unknown}).publish === true) {
      operation = {publish:true};
    } else {
      operation = {patch:parseLanguageUpdate(body)};
    }
  } catch {
    return json({ok:false, error:'INVALID_LANGUAGE_UPDATE'}, 400);
  }
  try {
    const language = 'publish' in operation
      ? await publishLanguage(code, admin.id)
      : await updateLanguage(code, operation.patch, admin.id);
    return json({ok:true, language});
  } catch (error) {
    if (error instanceof Error && error.message === 'LANGUAGE_NOT_READY') return json({ok:false, error:'LANGUAGE_NOT_READY'}, 400);
    if (error instanceof Error && error.message === 'LANGUAGE_NOT_FOUND') return json({ok:false, error:'LANGUAGE_NOT_FOUND'}, 404);
    return json({ok:false, error:'LANGUAGE_UPDATE_UNAVAILABLE'}, 503);
  }
}
