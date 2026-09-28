import { authFailure, authJson, readAuthJson } from '../client-auth/http';
import { ClientAuthError } from '../client-auth/validation';
import type { Subject, DeletionReceipt } from './types';

type Dependencies = {
  enabled(): boolean;
  subject(request: Request): Promise<Subject|null>;
  reauthenticate(subject: Subject,password:string): Promise<{proof:string;expiresAt:string}>;
  close(subject:Subject,proof:string): Promise<DeletionReceipt>;
  recover(proof:string): Promise<DeletionReceipt|null>;
};
const validProof = (value:unknown): value is string => typeof value==='string' && /^[A-Za-z0-9_-]{43}$/.test(value);
export function createDeletionHandlers(deps:Dependencies) {
  return {
    async POST(request:Request) {
      if(!deps.enabled()) return authJson({ok:false,error:'deletion_unavailable'},503);
      try {
        const subject=await deps.subject(request);
        if(!subject) throw new ClientAuthError('unauthorized',401);
        const value=await readAuthJson(request);
        if(!value || typeof value!=='object' || Array.isArray(value)) throw new ClientAuthError('invalid_input');
        const body=value as Record<string,unknown>;
        const keys=Object.keys(body);
        if(body.action==='verify' && keys.every(key=>['action','password'].includes(key)) &&
           typeof body.password==='string' && body.password.length>0 && body.password.length<=128) {
          return authJson({ok:true,...await deps.reauthenticate(subject,body.password)});
        }
        if(body.action==='confirm' && keys.every(key=>['action','proof'].includes(key)) && validProof(body.proof)) {
          return authJson({ok:true,...await deps.close(subject,body.proof)});
        }
        throw new ClientAuthError('invalid_input');
      } catch(error) { return authFailure(error); }
    },
    async GET(request:Request) {
      if(!deps.enabled()) return authJson({ok:false,error:'deletion_unavailable'},503);
      try {
        const proof=request.headers.get('x-deletion-proof');
        if(!validProof(proof)) throw new ClientAuthError('invalid_deletion_proof',401);
        const receipt=await deps.recover(proof);
        return receipt ? authJson({ok:true,...receipt}) : authJson({ok:false,error:'receipt_unavailable'},404);
      } catch(error) { return authFailure(error); }
    },
  };
}
