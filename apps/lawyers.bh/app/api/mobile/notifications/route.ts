import {sqlClient} from '@/lib/db/client';
import {clientAuthService} from '@/lib/client-auth/runtime';
import {handleInbox} from '@/lib/client-notifications/http';
import {createInboxStore} from '@/lib/client-notifications/store';
import {authorizeInboxRequests} from '@/lib/client-notifications/access';
export const runtime='nodejs';
export async function POST(request:Request) {
  return handleInbox(request,{session:token=>clientAuthService().session(token),authorizeRequests:ids=>authorizeInboxRequests(sqlClient,ids),run:createInboxStore(sqlClient).run});
}
