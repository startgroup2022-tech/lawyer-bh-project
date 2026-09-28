import {clientAuthService} from '@/lib/client-auth/runtime';
import {parseVerification} from '@/lib/client-auth/validation';
import {readAuthJson,authJson,authFailure,requestIp} from '@/lib/client-auth/http';
export const runtime='nodejs';
export async function POST(request:Request) {
  try {const input=parseVerification(await readAuthJson(request));return authJson({ok:true,...await clientAuthService().verify(input.challengeId,input.code,requestIp(request))});}
  catch(error) {return authFailure(error);}
}
