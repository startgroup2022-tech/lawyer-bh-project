import {sqlClient} from '@/lib/db/client';
import {authJson,requestIp} from '@/lib/client-auth/http';
import {allowClientPushRegistration} from '@/lib/sos/client-push-rate-limit';
import {handlePreferences} from '@/lib/notification-preferences/http';
import {createNotificationPreferencesStore} from '@/lib/notification-preferences/store';
export const runtime='nodejs';
export async function GET(request:Request){
  if(!allowClientPushRegistration(`preferences:${requestIp(request)}`))return authJson({ok:false,error:'rate_limited'},429);
  return handlePreferences(request,createNotificationPreferencesStore(sqlClient));
}
export const PUT=GET;
