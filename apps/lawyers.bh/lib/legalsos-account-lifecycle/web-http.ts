import type { Subject,DeletionReceipt } from './types';
import { authFailure,authJson,readAuthJson,requestIp } from '../client-auth/http';
import { ClientAuthError } from '../client-auth/validation';
type Dependencies={enabled():boolean;verify(role:Subject['role'],identifier:string,password:string,ip:string):Promise<{proof:string;expiresAt:string}>;
  resolve(proof:string):Promise<Subject|null>;close(subject:Subject,proof:string):Promise<DeletionReceipt>;recover(proof:string):Promise<DeletionReceipt|null>};
const validProof=(proof:unknown):proof is string=>typeof proof==='string'&&/^[A-Za-z0-9_-]{43}$/.test(proof);
export function createWebDeletionHandlers(deps:Dependencies){return {
  async POST(request:Request){
    if(!deps.enabled())return authJson({ok:false,error:'deletion_unavailable'},503);
    try{
      const value=await readAuthJson(request);
      if(!value||typeof value!=='object'||Array.isArray(value))throw new ClientAuthError('invalid_input');
      const body=value as Record<string,unknown>,keys=Object.keys(body);
      if(body.action==='verify'&&keys.every(key=>['action','role','identifier','password'].includes(key))&&
        (body.role==='client'||body.role==='lawyer')&&typeof body.identifier==='string'&&typeof body.password==='string'){
        return authJson({ok:true,...await deps.verify(body.role,body.identifier,body.password,requestIp(request))});
      }
      if(body.action==='confirm'&&keys.every(key=>['action','proof'].includes(key))&&validProof(body.proof)){
        const recovered=await deps.recover(body.proof);
        if(recovered)return authJson({ok:true,...recovered});
        const subject=await deps.resolve(body.proof);
        if(!subject)throw new ClientAuthError('invalid_deletion_proof',401);
        return authJson({ok:true,...await deps.close(subject,body.proof)});
      }
      throw new ClientAuthError('invalid_input');
    }catch(error){return authFailure(error);}
  },
  async GET(request:Request){
    if(!deps.enabled())return authJson({ok:false,error:'deletion_unavailable'},503);
    try{
      const proof=request.headers.get('x-deletion-proof');
      if(!validProof(proof))throw new ClientAuthError('invalid_deletion_proof',401);
      const receipt=await deps.recover(proof);
      if(receipt)return authJson({ok:true,...receipt});
      if(await deps.resolve(proof))return authJson({ok:false,error:'confirmation_not_received'},409);
      return authJson({ok:false,error:'receipt_unavailable'},404);
    }catch(error){return authFailure(error);}
  },
};}
