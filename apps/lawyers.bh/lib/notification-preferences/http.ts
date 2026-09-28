import {authJson,bearerToken} from '../client-auth/http';
import {ClientAuthError} from '../client-auth/validation';
import {readInboxJson} from '../client-notifications/input';
import {deviceDigest,parsePreferenceUpdate,type NotificationPreferences,type PreferenceUpdate} from './validation';
type Store={get:(key:string)=>Promise<NotificationPreferences>;save:(key:string,input:PreferenceUpdate)=>Promise<NotificationPreferences>};
export async function handlePreferences(request:Request,store:Store){
  try{
    const key=deviceDigest(bearerToken(request));
    if(request.method==='GET')return authJson({ok:true,preferences:await store.get(key)});
    if(request.method!=='PUT')return authJson({ok:false,error:'method_not_allowed'},405);
    const input=parsePreferenceUpdate(await readInboxJson(request));
    return authJson({ok:true,preferences:await store.save(key,input)});
  }catch(error){return authJson({ok:false,error:error instanceof ClientAuthError?error.code:'preferences_unavailable'},error instanceof ClientAuthError?error.status:503);}
}
