import {NextResponse} from 'next/server';
import {requireSuperAdmin} from '@/lib/auth/admin-access';
import {createLanguage, listLanguages} from '@/lib/countries/language-store';
import {parseLanguageCreate} from '@/lib/countries/languages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(body:unknown, status=200) {
  return NextResponse.json(body, {status, headers:{'Cache-Control':'no-store'}});
}

export async function GET() {
  if (!(await requireSuperAdmin())) return json({ok:false, error:'FORBIDDEN'}, 403);
  try {
    return json({ok:true, languages:await listLanguages()});
  } catch {
    return json({ok:false, error:'LANGUAGES_UNAVAILABLE'}, 503);
  }
}

export async function POST(request:Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return json({ok:false, error:'FORBIDDEN'}, 403);
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ok:false, error:'INVALID_ORIGIN'}, 403);
  let input:ReturnType<typeof parseLanguageCreate>;
  try {
    input = parseLanguageCreate(await request.json());
  } catch {
    return json({ok:false, error:'INVALID_LANGUAGE'}, 400);
  }
  try {
    const draft = {code:input.code, adminName:input.adminName, nativeName:input.nativeName, direction:input.direction};
    return json({ok:true, language:await createLanguage(draft, admin.id)}, 201);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return json({ok:false, error:'LANGUAGE_ALREADY_EXISTS'}, 409);
    }
    return json({ok:false, error:'LANGUAGE_CREATE_UNAVAILABLE'}, 503);
  }
}
