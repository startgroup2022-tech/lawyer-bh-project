import { requireSuperAdmin } from '@/lib/auth/admin-access';
import { sqlClient } from '@/lib/db/client';
import { authFailure,authJson,readAuthJson } from '@/lib/client-auth/http';
import { createDeletionAdminStore } from '@/lib/legalsos-account-lifecycle/admin';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const enabled=()=>process.env.LEGALSOS_DELETION_WORKFLOW_READY==='1';

export async function GET(request:Request) {
  try {
    if(!await requireSuperAdmin()) return authJson({ok:false,error:'forbidden'},403);
    if(!enabled()) return authJson({ok:false,error:'deletion_unavailable'},503);
    const params=new URL(request.url).searchParams;
    const limit=Number(params.get('limit')??20),offset=Number(params.get('offset')??0);
    if(!Number.isInteger(limit)||limit<1||limit>50||!Number.isInteger(offset)||offset<0||offset>10000) {
      return authJson({ok:false,error:'invalid_input'},400);
    }
    return authJson({ok:true,items:await createDeletionAdminStore(sqlClient).list(limit,offset)});
  } catch(error) {return authFailure(error);}
}

export async function POST(request:Request) {
  try {
    const admin=await requireSuperAdmin();
    if(!admin) return authJson({ok:false,error:'forbidden'},403);
    if(!enabled()) return authJson({ok:false,error:'deletion_unavailable'},503);
    // This endpoint uses a browser cookie: require an explicit same-origin proof.
    if(request.headers.get('origin')!==new URL(request.url).origin) return authJson({ok:false,error:'forbidden'},403);
    const body=await readAuthJson(request);
    if(!body||typeof body!=='object'||Array.isArray(body)||
      Object.keys(body).some(key=>!['lifecycleId','requestId'].includes(key))) return authJson({ok:false,error:'invalid_input'},400);
    const {lifecycleId,requestId}=body as Record<string,unknown>;
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if(typeof lifecycleId!=='string'||!uuid.test(lifecycleId)||typeof requestId!=='string'||!uuid.test(requestId)) return authJson({ok:false,error:'invalid_input'},400);
    return authJson({ok:true,...await createDeletionAdminStore(sqlClient).settle(lifecycleId,requestId,admin.id)});
  } catch(error) {return authFailure(error);}
}
