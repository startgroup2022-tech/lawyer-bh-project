import {parseInboxInput,type InboxInput} from '../client-notifications/input';
export type LawyerInboxInput=Omit<InboxInput,'requestIds'>;
export async function handleLawyerInbox(request:Request,owner:string|null,run:(owner:string,input:LawyerInboxInput)=>Promise<unknown>) {
  const respond=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
  if(!owner)return respond({error:'unauthenticated'},401);
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return respond({error:'forbidden'},403);
  const text=await request.text();
  if(text.length>4096)return respond({error:'body_too_large'},413);
  let body:unknown;
  try{body=JSON.parse(text);}catch{return respond({error:'invalid_input'},400);}
  let input:LawyerInboxInput;
  try{
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['filter','before','beforeId','readId','readThrough'].includes(k)))throw Error();
    const {requestIds:_,...parsed}=parseInboxInput({...body,requests:[]});
    input=parsed;
  }catch{return respond({error:'invalid_input'},400);}
  try{return respond({ok:true,...await run(owner,input) as object});}
  catch{return respond({error:'unavailable'},503);}
}
