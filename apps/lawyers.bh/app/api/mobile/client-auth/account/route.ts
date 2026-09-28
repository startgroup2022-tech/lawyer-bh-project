import {clientAuthService} from '@/lib/client-auth/runtime';
import {authFailure,authJson,bearerToken,readAuthJson} from '@/lib/client-auth/http';
import {parsePersonalInfo} from '@/lib/client-auth/validation';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function PATCH(request:Request) {
  const token=bearerToken(request);
  if(!token) return authJson({ok:false,error:'unauthorized'},401);
  try {
    const input=parsePersonalInfo(await readAuthJson(request));
    return authJson({ok:true,client:await clientAuthService().updatePersonalInfo(token,input)});
  } catch(error) {return authFailure(error);}
}
export async function DELETE(request:Request) {
  const token=bearerToken(request);
  if(!token) return authJson({ok:false,error:'unauthorized'},401);
  let allowDelete = false;
  try {
    const rawBody = await request.text();
    if (rawBody) {
      const parsed = JSON.parse(rawBody);
      allowDelete = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
    }
  } catch {}
  if (!allowDelete) {
    // Legacy clients must not hard-delete before the confirmed retention workflow.
    // No identity lookup or mutation: current clients use /mobile/account-deletion.
    return authJson({ok:false,error:'deletion_confirmation_required'},409);
  }
  try {
    await clientAuthService().deleteAccount(token);
    return authJson({ok:true});
  } catch(error) {return authFailure(error);}
}
