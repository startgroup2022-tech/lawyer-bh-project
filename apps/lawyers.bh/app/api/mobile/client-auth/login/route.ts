import {clientAuthService} from '@/lib/client-auth/runtime';
import {parsePasswordLogin} from '@/lib/client-auth/validation';
import {readAuthJson,authJson,authFailure,requestIp} from '@/lib/client-auth/http';
export const runtime='nodejs';
export async function POST(request:Request) {
  try {
    const {email,password}=parsePasswordLogin(await readAuthJson(request));
    return authJson({ok:true,...await clientAuthService().login(email,password,requestIp(request))});
  } catch(error) {return authFailure(error);}
}
