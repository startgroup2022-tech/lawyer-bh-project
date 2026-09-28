import type { Subject } from './types';
type Resolvers = {
  client(token:string):Promise<{id:string}|null>;
  lawyer(request:Request):Promise<{lawyerId:string;countryCode:string}|null>;
};
const defaults:Resolvers = {
  client: async token => {
    const {clientAuthService}=await import('../client-auth/runtime');
    return clientAuthService().session(token);
  },
  lawyer: async request => {
    const {getMobileLawyerSession}=await import('../mobile-lawyer-auth');
    return getMobileLawyerSession(request);
  },
};
export async function resolveDeletionSubject(request:Request,resolvers:Resolvers=defaults):Promise<Subject|null> {
  const token=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')??'')?.[1];
  if(!token) return null;
  if(/^[0-9a-f]{64}$/.test(token)) {
    const client=await resolvers.client(token);
    return client ? {role:'client',id:client.id} : null;
  }
  const lawyer=await resolvers.lawyer(request);
  return lawyer ? {role:'lawyer',id:lawyer.lawyerId} : null;
}
