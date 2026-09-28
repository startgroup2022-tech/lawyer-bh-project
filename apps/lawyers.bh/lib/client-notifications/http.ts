import {authJson,bearerToken} from '../client-auth/http';
import {ClientAuthError} from '../client-auth/validation';
import {parseInboxInput,readInboxJson,type InboxInput} from './input';
import type {InboxPage} from './store';
type Dependencies={session:(token:string)=>Promise<{id:string}|null>;authorizeRequests:(ids:string[])=>Promise<boolean>;run:(input:InboxInput,clientId:string|null)=>Promise<InboxPage>};
export async function handleInbox(request:Request,deps:Dependencies) {
  try {
    const input=parseInboxInput(await readInboxJson(request));
    let clientId:string|null=null;
    if(request.headers.has('authorization')) {
      const token=bearerToken(request);
      const client=token?await deps.session(token):null;
      if(!client)throw new ClientAuthError('unauthorized',401);
      clientId=client.id;
    }
    if(!clientId&&!input.requestIds.length) return authJson({ok:true,items:[],unreadCount:0,nextCursor:null,snapshotAt:new Date().toISOString()});
    if(!await deps.authorizeRequests(input.requestIds))throw new ClientAuthError('forbidden',403);
    return authJson({ok:true,...await deps.run(input,clientId)});
  }catch(error){
    console.error('client_notifications_failed',{
      name:error instanceof Error?error.name:'unknown',
      message:error instanceof Error?error.message:'unknown',
      code:typeof error==='object'&&error!==null&&'code' in error?String(error.code):null,
    });
    return authJson({ok:false,error:error instanceof ClientAuthError?error.code:'notifications_unavailable'},error instanceof ClientAuthError?error.status:503);
  }
}
