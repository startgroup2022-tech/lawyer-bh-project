import {clientAuthService} from '@/lib/client-auth/runtime';
import {parseAccountRequest} from '@/lib/client-auth/validation';
import {readAuthJson,authJson,authFailure,requestIp} from '@/lib/client-auth/http';
export const runtime='nodejs';
export async function POST(request:Request) {
  try {const input=parseAccountRequest(await readAuthJson(request));return authJson({ok:true,...await clientAuthService().request(input,requestIp(request))});}
  catch(error) {return authFailure(error);}
}
