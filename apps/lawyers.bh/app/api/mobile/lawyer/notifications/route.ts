import {requireAdvocateRequest} from '@/lib/sos/lawyerAuth';
import {sqlClient} from '@/lib/db/client';
import {createLawyerInboxStore} from '@/lib/lawyer-notifications/store';
import {handleLawyerInbox} from '@/lib/lawyer-notifications/http';
export const runtime='nodejs';
export async function POST(request:Request){
 const auth=await requireAdvocateRequest(request);
 return handleLawyerInbox(request,auth.ok&&auth.advocate.countryCode==='BH'?auth.advocate.id:null,createLawyerInboxStore(sqlClient).run);
}
