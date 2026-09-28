import {NextResponse} from 'next/server';
import {ClientAuthError} from './validation';

export async function readAuthJson(request:Request):Promise<unknown> {
  const origin=request.headers.get('origin');
  if (origin && origin!==new URL(request.url).origin) throw new ClientAuthError('forbidden',403);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new ClientAuthError('invalid_content_type',415);
  const reader=request.body?.getReader();
  if (!reader) throw new ClientAuthError('invalid_input');
  let size=0;
  const chunks:Uint8Array[]=[];
  while (true) {
    const {done,value}=await reader.read();
    if (done) break;
    size+=value.length;
    if(size>4096) {await reader.cancel();throw new ClientAuthError('body_too_large',413);}
    chunks.push(value);
  }
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch {throw new ClientAuthError('invalid_input');}
}
export function bearerToken(request:Request) {
  return /^Bearer ([0-9a-f]{64})$/.exec(request.headers.get('authorization')??'')?.[1]??null;
}
export function authJson(body:unknown,status=200) {return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});}
export function authFailure(error:unknown) {
  return authJson({ok:false,error:error instanceof ClientAuthError?error.code:'auth_unavailable'},error instanceof ClientAuthError?error.status:503);
}
export function requestIp(request:Request) {
  // Vercel supplies its own forwarded IP; never accept a client-selected key from JSON.
  return process.env.VERCEL==='1' ? (request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown') : 'local';
}
