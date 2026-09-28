import {clientAuthService} from '@/lib/client-auth/runtime';
import {authJson,authFailure,bearerToken} from '@/lib/client-auth/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  const token=bearerToken(request);
  if(!token) return authJson({ok:false,error:'unauthorized'},401);
  try {const client=await clientAuthService().session(token);return client?authJson({ok:true,client}):authJson({ok:false,error:'unauthorized'},401);}
  catch(error) {return authFailure(error);}
}
export async function DELETE(request:Request) {
  const token=bearerToken(request);
  if(!token) return authJson({ok:false,error:'unauthorized'},401);
  try {await clientAuthService().logout(token);return authJson({ok:true});}
  catch(error) {return authFailure(error);}
}
