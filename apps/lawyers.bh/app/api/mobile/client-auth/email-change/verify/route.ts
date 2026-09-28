import {clientAuthService} from '@/lib/client-auth/runtime';
import {authFailure,authJson,bearerToken,readAuthJson,requestIp} from '@/lib/client-auth/http';
import {parseEmailChangeVerification} from '@/lib/client-auth/validation';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request) {
  const token=bearerToken(request);
  if(!token) return authJson({ok:false,error:'unauthorized'},401);
  try {
    const {challengeId,code}=parseEmailChangeVerification(await readAuthJson(request));
    return authJson({ok:true,client:await clientAuthService().verifyEmailChange(token,challengeId,code,requestIp(request))});
  } catch(error) {return authFailure(error);}
}
