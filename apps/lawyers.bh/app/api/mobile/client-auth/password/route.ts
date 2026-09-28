import {clientAuthService} from '@/lib/client-auth/runtime';
import {authFailure,authJson,bearerToken,readAuthJson,requestIp} from '@/lib/client-auth/http';
import {parsePasswordChange} from '@/lib/client-auth/validation';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function PATCH(request:Request) {
  const token=bearerToken(request);
  if(!token) return authJson({ok:false,error:'unauthorized'},401);
  try {
    const input=parsePasswordChange(await readAuthJson(request));
    await clientAuthService().changePassword(token,input,requestIp(request));
    return authJson({ok:true});
  } catch(error) {return authFailure(error);}
}
