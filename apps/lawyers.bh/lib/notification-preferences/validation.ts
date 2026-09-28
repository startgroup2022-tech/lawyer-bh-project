import {createHash} from 'node:crypto';
import {ClientAuthError} from '../client-auth/validation';
export type NotificationCategory='requests'|'communications'|'advertising';
export type NotificationPreferences={enabled:boolean;requests:boolean;communications:boolean;advertising:boolean};
export type PreferenceUpdate={preferences:NotificationPreferences|null;token:string|null};
export const defaultPreferences:NotificationPreferences={enabled:true,requests:true,communications:true,advertising:true};
export function deviceDigest(secret:string|null){
  if(!secret||!/^[0-9a-f]{64}$/.test(secret))throw new ClientAuthError('unauthorized',401);
  return createHash('sha256').update(`notification-device:${secret}`).digest('hex');
}
export function tokenDigest(token:string){return createHash('sha256').update(`notification-token:${token}`).digest('hex');}
export function parsePreferenceUpdate(value:unknown):PreferenceUpdate{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new ClientAuthError('invalid_input');
  const d=value as Record<string,unknown>;let preferences:NotificationPreferences|null=null;
  if(d.preferences!=null){
    const p=d.preferences as Record<string,unknown>;
    if(typeof p!=='object'||Array.isArray(p)||Object.keys(defaultPreferences).some(key=>typeof p[key]!=='boolean'))throw new ClientAuthError('invalid_preferences');
    preferences={enabled:p.enabled as boolean,requests:p.requests as boolean,communications:p.communications as boolean,advertising:p.advertising as boolean};
  }
  const token=d.token==null?null:typeof d.token==='string'?d.token.trim():'';
  if(token!==null&&(!token||token.length>4096))throw new ClientAuthError('invalid_token');
  if(!preferences&&!token)throw new ClientAuthError('invalid_input');
  return {preferences,token};
}
