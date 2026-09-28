import {ClientAuthError} from '../client-auth/validation';
import {verifyMobileDispatchToken} from '../sos/mobile-dispatch-auth';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export type InboxInput={requestIds:string[];filter:'all'|'unread';before:string|null;beforeId:string|null;readId:string|null;readThrough:string|null};
function date(value:unknown):string|null {
  if(value==null) return null;
  if(typeof value!=='string'||value.length>40||!/^\d{4}-\d\d-\d\dT/.test(value)||!Number.isFinite(Date.parse(value))) throw new ClientAuthError('invalid_input');
  return value;
}
export function parseInboxInput(value:unknown):InboxInput {
  if(!value||typeof value!=='object'||Array.isArray(value)) throw new ClientAuthError('invalid_input');
  const d=value as Record<string,unknown>;
  if(!Array.isArray(d.requests)||d.requests.length>100) throw new ClientAuthError('invalid_input');
  const requestIds=d.requests.map((item:unknown)=>{
    const r=item as Record<string,unknown>|null;
    if(!r||typeof r.id!=='string'||!uuid.test(r.id)||typeof r.token!=='string'||r.token.length>128) throw new ClientAuthError('invalid_input');
    if(!verifyMobileDispatchToken(r.id,r.token)) throw new ClientAuthError('forbidden',403);
    return r.id;
  });
  if(d.filter!=null&&d.filter!=='all'&&d.filter!=='unread') throw new ClientAuthError('invalid_input');
  for(const key of ['readId','beforeId']) if(d[key]!=null&&(typeof d[key]!=='string'||!uuid.test(d[key] as string))) throw new ClientAuthError('invalid_input');
  const before=date(d.before),readThrough=date(d.readThrough);
  if(Boolean(before)!==Boolean(d.beforeId)||d.readAll!=null||(d.readId&&readThrough)) throw new ClientAuthError('invalid_input');
  return {requestIds:[...new Set(requestIds)],filter:d.filter==='unread'?'unread':'all',before,beforeId:d.beforeId as string??null,readId:d.readId as string??null,readThrough};
}
export async function readInboxJson(request:Request):Promise<unknown> {
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin) throw new ClientAuthError('forbidden',403);
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new ClientAuthError('invalid_content_type',415);
  const reader=request.body?.getReader();
  if(!reader) throw new ClientAuthError('invalid_input');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>32768){await reader.cancel();throw new ClientAuthError('body_too_large',413);}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new ClientAuthError('invalid_input');}
}
