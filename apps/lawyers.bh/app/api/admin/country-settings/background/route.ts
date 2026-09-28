import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin-access';
import { countryCatalog } from '@/lib/countries/catalog';
import { saveCountrySettings } from '@/lib/countries/store';
import { validateBackground } from '@/lib/countries/background';

export const runtime = 'nodejs';
export async function POST(request:Request) {
  if (!(await requireSuperAdmin())) return NextResponse.json({error:'Forbidden'}, {status:403});
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({error:'Invalid origin'}, {status:403});
  let code:string;
  let file:File;
  let extension:string;
  try {
    const form = await request.formData();
    code = String(form.get('code') ?? '');
    if (!countryCatalog.some(c => c.code === code)) throw new Error('Unknown country');
    const upload = form.get('background');
    if (!(upload instanceof File)) throw new Error('Select an image');
    file = upload;
    extension = await validateBackground(file);
  } catch (error) {
    return NextResponse.json({error:error instanceof Error ? error.message : 'Invalid image'}, {status:400});
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({error:'Background storage is not configured'}, {status:503});
  try {
    const blob = await put(`country-backgrounds/${code}/${randomUUID()}.${extension}`, file, {access:'public',contentType:file.type});
    await saveCountrySettings(code, {backgroundUrl:blob.url});
    // Previous images are retained; changing a background never deletes shared media.
    return NextResponse.json({ok:true,backgroundUrl:blob.url});
  } catch {
    return NextResponse.json({error:'Could not save background'}, {status:503});
  }
}
