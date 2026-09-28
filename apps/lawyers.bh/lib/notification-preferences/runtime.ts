import 'server-only';
import type {NotificationCategory} from './validation';
import {createNotificationPreferencesStore} from './store';
export async function filterNotificationTokens(tokens:string[],category:NotificationCategory){
  if(!tokens.length)return [];
  const {sqlClient}=await import('@/lib/db/client');
  return createNotificationPreferencesStore(sqlClient).filterTokens(tokens,category);
}
